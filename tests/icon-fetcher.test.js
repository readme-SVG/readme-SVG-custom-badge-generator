'use strict';

const assert = require('node:assert/strict');
const dns = require('node:dns');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const { Readable } = require('node:stream');
const test = require('node:test');
const { fetchIconAsDataUri, isPublicAddress } = require('../api/iconFetcher');

function mockHttps(addresses, responses) {
  const originalGet = https.get;
  const originalLookup = dns.lookup;
  const attempts = [];
  const connections = [];
  const streams = [];

  dns.lookup = (hostname, _options, callback) => callback(null, addresses[hostname] || []);
  https.get = (url, options, callback) => {
    const request = new EventEmitter();
    attempts.push(url.href);
    process.nextTick(() => {
      options.lookup(url.hostname, { all: true }, (error, addresses) => {
        if (error) return request.emit('error', error);
        assert.ok(Array.isArray(addresses));
        connections.push({ url: url.href, address: addresses[0].address });
        const spec = responses.shift();
        if (!spec) return request.emit('error', new Error('Unexpected request'));
        const stream = Readable.from(spec.chunks || []);
        stream.statusCode = spec.status || 200;
        stream.headers = spec.headers || {};
        streams.push(stream);
        callback(stream);
      });
    });
    return request;
  };

  return {
    attempts, connections, streams,
    restore() { https.get = originalGet; dns.lookup = originalLookup; },
  };
}

const PUBLIC = [{ address: '8.8.8.8', family: 4 }];

test('address policy blocks private, metadata, tunnel and mapped IPv4 networks', () => {
  for (const address of [
    '127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1',
    '192.168.0.1', '100.64.0.1', '198.18.0.1', '0.0.0.0',
    '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1',
    '::ffff:8.8.8.8', '2002::1', '2001:db8::1',
  ]) assert.equal(isPublicAddress(address), false, address);
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
    assert.equal(isPublicAddress(address), true, address);
  }
});

test('literal private addresses and insecure protocols are rejected before connecting', async () => {
  const mock = mockHttps({}, []);
  try {
    assert.equal(await fetchIconAsDataUri('https://169.254.169.254/latest/meta-data/'), null);
    assert.equal(await fetchIconAsDataUri('https://[::ffff:127.0.0.1]/icon.svg'), null);
    assert.equal(await fetchIconAsDataUri('http://example.com/icon.png'), null);
    assert.deepEqual(mock.attempts, []);
  } finally { mock.restore(); }
});

test('DNS answers containing any private address are rejected before opening a socket', async () => {
  const mock = mockHttps({ 'example.com': [...PUBLIC, { address: '127.0.0.1', family: 4 }] }, []);
  try {
    assert.equal(await fetchIconAsDataUri('https://example.com/icon.png'), null);
    assert.equal(mock.attempts.length, 1);
    assert.deepEqual(mock.connections, []);
  } finally { mock.restore(); }
});

test('the checked DNS result is pinned and allowed image responses are streamed', async () => {
  const mock = mockHttps({ 'example.com': PUBLIC }, [
    { headers: { 'content-type': 'image/png' }, chunks: [Buffer.from('a'), Buffer.from('bc')] },
  ]);
  try {
    assert.equal(await fetchIconAsDataUri('https://example.com/icon.png'), 'data:image/png;base64,YWJj');
    assert.deepEqual(mock.connections, [{ url: 'https://example.com/icon.png', address: '8.8.8.8' }]);
  } finally { mock.restore(); }
});

test('redirects are individually checked and must stay on HTTPS', async () => {
  const mock = mockHttps({ 'example.com': PUBLIC, 'cdn.example.com': PUBLIC }, [
    { status: 302, headers: { location: 'https://cdn.example.com/icon.svg' } },
    { headers: { 'content-type': 'text/plain' }, chunks: [Buffer.from('<svg/>')] },
  ]);
  try {
    assert.equal(await fetchIconAsDataUri('https://example.com/icon.svg'),
      'data:image/svg+xml;base64,PHN2Zy8+');
    assert.equal(mock.connections.length, 2);
  } finally { mock.restore(); }

  const insecure = mockHttps({ 'example.com': PUBLIC }, [
    { status: 301, headers: { location: 'http://127.0.0.1/private' } },
  ]);
  try {
    assert.equal(await fetchIconAsDataUri('https://example.com/icon.png'), null);
    assert.equal(insecure.attempts.length, 1);
  } finally { insecure.restore(); }
});

test('encoded or non-image responses cannot be embedded as icons', async () => {
  const mock = mockHttps({ 'example.com': PUBLIC }, [
    { headers: { 'content-type': 'image/png', 'content-encoding': 'gzip' }, chunks: [] },
    { headers: { 'content-type': 'text/html' }, chunks: [Buffer.from('<script/>')] },
  ]);
  try {
    assert.equal(await fetchIconAsDataUri('https://example.com/compressed.png'), null);
    assert.equal(await fetchIconAsDataUri('https://example.com/not-an-image'), null);
  } finally { mock.restore(); }
});

test('streaming rejects both declared and undeclared oversized responses', async () => {
  const mock = mockHttps({ 'example.com': PUBLIC }, [
    { headers: { 'content-type': 'image/png', 'content-length': '200000' }, chunks: [] },
    { headers: { 'content-type': 'image/png' }, chunks: [Buffer.alloc(130_000), Buffer.alloc(30_000)] },
  ]);
  try {
    assert.equal(await fetchIconAsDataUri('https://example.com/declared.png'), null);
    assert.equal(await fetchIconAsDataUri('https://example.com/streamed.png'), null);
    assert.equal(mock.streams.length, 2);
    assert.equal(mock.streams[1].destroyed, true);
  } finally { mock.restore(); }
});
