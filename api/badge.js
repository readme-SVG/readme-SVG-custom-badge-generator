'use strict';

const { generateBadge } = require('../badge-core');
const { fetchIconAsDataUri } = require('./iconFetcher');

const SVG_HEADERS = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
  'X-Content-Type-Options': 'nosniff',
};

function parseBool(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function sendBadge(res, status, svg, cacheControl) {
  for (const [name, value] of Object.entries(SVG_HEADERS)) res.setHeader(name, value);
  res.setHeader('Cache-Control', cacheControl);
  res.status(status).send(svg);
}

module.exports = async function handler(req, res) {
  try {
    const q = req.query || {};
    let iconData = '';
    if (typeof q.iconUrl === 'string' && q.iconUrl) {
      iconData = await fetchIconAsDataUri(q.iconUrl) || '';
    } else if (typeof q.iconData === 'string') {
      // Query decoding treats unescaped '+' in base64 data as spaces.
      iconData = q.iconData.replace(/ /g, '+');
    }

    const params = {
      label: typeof q.label === 'string' ? q.label : undefined,
      value: typeof q.value === 'string' ? q.value : undefined,
      icon: typeof q.icon === 'string' ? q.icon : undefined,
      iconData,
      style: typeof q.style === 'string' ? q.style : undefined,
      theme: typeof q.theme === 'string' ? q.theme : undefined,
      size: typeof q.size === 'string' ? q.size : undefined,
      scale: typeof q.scale === 'string' ? Number.parseFloat(q.scale) : undefined,
      labelBg: typeof q.labelBg === 'string' ? q.labelBg : undefined,
      valueBg: typeof q.valueBg === 'string' ? q.valueBg : undefined,
      labelColor: typeof q.labelColor === 'string' ? q.labelColor : undefined,
      valueColor: typeof q.valueColor === 'string' ? q.valueColor : undefined,
      borderColor: typeof q.borderColor === 'string' ? q.borderColor : undefined,
      borderRadius: typeof q.borderRadius === 'string' ? Number.parseInt(q.borderRadius, 10) : null,
      gradient: parseBool(q.gradient),
      uppercase: parseBool(q.uppercase),
      compact: parseBool(q.compact),
    };

    sendBadge(res, 200, generateBadge(params), 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400');
  } catch {
    const errorSvg = generateBadge({ label: 'error', value: 'badge generation failed' });
    sendBadge(res, 500, errorSvg, 'no-store');
  }
};
