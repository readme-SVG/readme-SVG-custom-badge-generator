'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const handler = require('../api/badge');

function response() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
}

test('Vercel endpoint serves escaped SVG with image-only security headers', async () => {
  const res = response();
  await handler({ query: { label: '<script>alert(1)</script>', value: 'ok', style: 'outline', borderColor: '#ff0000' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/svg+xml; charset=utf-8');
  assert.match(res.headers['cache-control'], /max-age=300/);
  assert.match(res.headers['content-security-policy'], /sandbox/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(res.body, /<script>/);
  assert.match(res.body, /stroke="#ff0000"/);
});

test('legacy unescaped base64 plus signs are restored without accepting arbitrary URI schemes', async () => {
  const res = response();
  await handler({ query: { iconData: 'data:image/png;base64,  //AA==' } }, res);
  assert.match(res.body, /<image [^>]+href="data:image\/png;base64,\+\+\/\/AA=="/);

  const invalid = response();
  await handler({ query: { iconData: 'data:text/html;base64,PHNjcmlwdD4=' } }, invalid);
  assert.doesNotMatch(invalid.body, /<image /);
});

test('private image URLs never reach the network', async () => {
  const res = response();
  await handler({ query: { iconUrl: 'https://127.0.0.1/latest/meta-data' } }, res);
  assert.equal(res.statusCode, 200);
  assert.doesNotMatch(res.body, /<image /);
});

test('unexpected request errors are not cached', async () => {
  const req = { get query() { throw new Error('Broken query parser'); } };
  const res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.match(res.body, /badge generation failed/);
});
