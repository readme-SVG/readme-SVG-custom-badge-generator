'use strict';

const dns = require('node:dns');
const https = require('node:https');
const net = require('node:net');
const { getHttpsIconUrl, MAX_ICON_DATA_LEN, validateIconData } = require('../badge-core');

const FETCH_TIMEOUT_MS = 3_000;
const MAX_REDIRECTS = 5;
const MIME_BY_EXTENSION = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
};
const IMAGE_MIMES = new Set(Object.values(MIME_BY_EXTENSION));
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// Deny non-global addresses, including metadata services and IPv6 transition ranges.
const blockedIPv4 = new net.BlockList();
const blockedIPv6 = new net.BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blockedIPv4.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 3], ['4000::', 2], ['8000::', 1],
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20],
]) blockedIPv6.addSubnet(address, prefix, 'ipv6');

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return !blockedIPv4.check(address, 'ipv4');
  if (family === 6) return !blockedIPv6.check(address, 'ipv6');
  return false;
}

// HTTPS uses the checked DNS result for the socket, avoiding a second resolution.
function publicLookup(hostname, options, callback) {
  dns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error);
    if (!addresses?.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      return callback(new Error('Icon host does not resolve to public addresses'));
    }
    const matching = addresses.filter(({ family }) => !options.family || family === options.family);
    if (!matching.length) return callback(new Error('No address matches the requested family'));
    if (options.all) callback(null, matching);
    else callback(null, matching[0].address, matching[0].family);
  });
}

function getContentType(response, url) {
  let mime = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!mime || mime === 'text/plain' || mime === 'application/octet-stream') {
    const pathname = url.pathname.toLowerCase();
    const extension = Object.keys(MIME_BY_EXTENSION).find(ext => pathname.endsWith(ext));
    mime = extension ? MIME_BY_EXTENSION[extension] : '';
  }
  return IMAGE_MIMES.has(mime) ? mime : null;
}

function requestIcon(url, signal) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      signal,
      lookup: publicLookup,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CustomBadgeGenerator/1.0)',
        Accept: 'image/*',
        'Accept-Encoding': 'identity',
      },
    }, resolve);
    request.on('error', reject);
  });
}

async function fetchIconAsDataUri(value) {
  if (!getHttpsIconUrl(value)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let current = new URL(value);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const hostname = current.hostname.replace(/^\[|\]$/g, '');
      if (net.isIP(hostname) && !isPublicAddress(hostname)) return null;

      const response = await requestIcon(current, controller.signal);
      if (REDIRECT_STATUSES.has(response.statusCode)) {
        const location = response.headers.location;
        response.destroy();
        if (!location || redirects === MAX_REDIRECTS) return null;
        const next = new URL(location, current);
        if (!getHttpsIconUrl(next.href)) return null;
        current = next;
        continue;
      }
      if (response.statusCode !== 200 ||
          (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.destroy();
        return null;
      }

      const mime = getContentType(response, current);
      if (!mime) {
        response.destroy();
        return null;
      }
      const prefix = `data:${mime};base64,`;
      const maxBytes = Math.floor((MAX_ICON_DATA_LEN - prefix.length) / 4) * 3;
      if (Number(response.headers['content-length']) > maxBytes) {
        response.destroy();
        return null;
      }

      const chunks = [];
      let bytes = 0;
      for await (const chunk of response) {
        bytes += chunk.length;
        if (bytes > maxBytes) return null;
        chunks.push(chunk);
      }
      return validateIconData(prefix + Buffer.concat(chunks, bytes).toString('base64'));
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchIconAsDataUri, isPublicAddress };
