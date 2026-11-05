'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { after, before, test } = require('node:test');
const app = require('../server/dist/index').default;
const { addCustomIcon, listIcons } = require('../server/dist/services/iconService');

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR4nGNgYGBgYAAAAAUAAVo1bP0AAAAASUVORK5CYII=';
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function postIcon(body) {
  return fetch(`${baseUrl}/icon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('frontend assets are served but server source and configuration are not', async () => {
  const index = await fetch(baseUrl);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /<script src="badge-core.js"><\/script>/);
  for (const asset of ['app.js', 'badge-core.js', 'styles.css', 'sample_svgs/sample_build.svg']) {
    const res = await fetch(`${baseUrl}/${asset}`);
    assert.equal(res.status, 200, asset);
    assert.ok((await res.text()).length > 50);
  }
  for (const privatePath of ['server/package.json', 'server/dist/index.js', 'api/iconFetcher.js']) {
    const res = await fetch(`${baseUrl}/${privatePath}`);
    const body = await res.text();
    assert.doesNotMatch(body, /"dependencies"|require\('node:dns'\)|express\.json\(/);
    assert.match(body, /<!DOCTYPE html>/);
  }
});

test('query, path and frontend URLs render the same escaped badge', async () => {
  const params = '?label=build&value=passing&style=flat&theme=terminal';
  const query = await fetch(`${baseUrl}/badge${params}`);
  const alias = await fetch(`${baseUrl}/api/badge${params}`);
  assert.equal(query.status, 200);
  assert.equal(await query.text(), await alias.text());
  assert.match(query.headers.get('content-type'), /^image\/svg\+xml/);
  assert.match(query.headers.get('content-security-policy'), /sandbox/);
  assert.equal(query.headers.get('x-content-type-options'), 'nosniff');
  assert.match(query.headers.get('cache-control'), /max-age=300/);

  const path = await fetch(`${baseUrl}/badge/build__status-passing__now?label=ignored&value=ignored`);
  const svg = await path.text();
  assert.match(svg, /build status: passing now/);
  assert.doesNotMatch(svg, /ignored/);

  const unsafe = await fetch(`${baseUrl}/badge?label=${encodeURIComponent('<script>')}&value=${encodeURIComponent('"&')}&style=constructor&theme=__proto__&size=toString`);
  const escaped = await unsafe.text();
  assert.equal(unsafe.status, 200);
  assert.match(escaped, /&lt;script&gt;/);
  assert.doesNotMatch(escaped, /<script>/);
  assert.match(escaped, /width="\d+" height="\d+"/);
});

test('icon upload validates types and data, and custom icons resolve by slug', async () => {
  const missing = await postIcon({ slug: 1, type: {}, data: 10 });
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).error, 'Missing required fields: slug, type, data');
  assert.equal((await postIcon({ slug: 'bad slug', type: 'png', data: PNG })).status, 400);
  assert.equal((await postIcon({ slug: 'unsafe', type: 'image/png', data: 'data:text/html;base64,PHN2Zy8+' })).status, 400);
  assert.equal((await postIcon({ slug: 'none', type: 'image/png', data: PNG })).status, 409);

  const created = await postIcon({ slug: 'my-icon', type: 'image/png', data: PNG });
  assert.equal(created.status, 201);
  assert.equal((await postIcon({ slug: 'my-icon', type: 'image/png', data: PNG })).status, 409);
  const icon = await fetch(`${baseUrl}/badge?icon=my-icon&label=ok&value=yes`);
  assert.match(await icon.text(), /<image [^>]+href="data:image\/png;base64,/);
  const catalog = await (await fetch(`${baseUrl}/list.json`)).json();
  assert.ok(catalog.icons.builtin.includes('check'));
  assert.ok(catalog.icons.custom.some(item => item.slug === 'my-icon'));
  assert.ok(catalog.styles.includes('pill'));
});

test('malformed and oversized JSON bodies get bounded, uncached errors', async () => {
  const badJson = await fetch(`${baseUrl}/icon`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(badJson.status, 400);
  assert.equal((await badJson.json()).error, 'Invalid JSON body');
  assert.equal(badJson.headers.get('cache-control'), 'no-store');

  const large = await fetch(`${baseUrl}/icon`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'a'.repeat(270_000) }),
  });
  assert.equal(large.status, 413);
  assert.equal((await large.json()).error, 'Request body too large');
  assert.equal(large.headers.get('x-content-type-options'), 'nosniff');
});

test('in-memory icon storage is bounded by entry count and total bytes', () => {
  const initial = listIcons().custom.length;
  for (let i = 0; i < 100 - initial; i++) {
    assert.equal(addCustomIcon(`limit-${i}`, 'image/png', PNG).success, true);
  }
  const full = addCustomIcon('limit-extra', 'image/png', PNG);
  assert.equal(full.success, false);
  assert.equal(full.status, 507);

  const script = `
    const assert = require('node:assert/strict');
    const { addCustomIcon } = require('./server/dist/services/iconService');
    const data = 'data:image/png;base64,' + 'A'.repeat(180000);
    for (let i = 0; i < 11; i++) assert.equal(addCustomIcon('large-' + i, 'image/png', data).success, true);
    assert.equal(addCustomIcon('large-extra', 'image/png', data).status, 507);
  `;
  const child = spawnSync(process.execPath, ['-e', script], { cwd: require('node:path').join(__dirname, '..'), encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
});
