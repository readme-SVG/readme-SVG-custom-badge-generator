'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const core = require('../badge-core');
const serverRenderer = require('../server/dist/services/badgeRenderer');

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR4nGNgYGBgYAAAAAUAAVo1bP0AAAAASUVORK5CYII=';

test('browser and Express renderers agree across styles, themes and sizes', () => {
  for (const style of Object.keys(core.STYLES)) {
    for (const theme of Object.keys(core.THEMES)) {
      for (const size of Object.keys(core.SIZES)) {
        const opts = { label: 'release 🚀', value: 'A&B', icon: 'rocket', style, theme, size, scale: 1.35, gradient: true };
        assert.equal(core.generateBadge(opts), serverRenderer.generateBadge(opts));
      }
    }
  }
  const iconOpts = { label: 'custom', value: 'ok', iconData: PNG, compact: true, borderRadius: 0 };
  assert.equal(core.generateBadge(iconOpts), serverRenderer.generateBadge(iconOpts));
});

test('SVG escapes user input and replaces invalid XML characters', () => {
  const svg = core.generateBadge({ label: '<script>"&\x00🚀', value: '</text>\ud800' });
  assert.match(svg, /&lt;script&gt;&quot;&amp;�🚀/u);
  assert.match(svg, /&lt;\/text&gt;�/u);
  assert.doesNotMatch(svg, /<script>|\x00|\ud800/u);
  assert.match(svg, /aria-label="[^"]*"/u);
});

test('non-finite numbers, prototype keys and Unicode boundaries use safe defaults', () => {
  const fallback = core.generateBadge({ icon: 'none' });
  assert.equal(core.generateBadge({ style: 'constructor', theme: '__proto__', size: 'toString', icon: 'toString' }), fallback);
  assert.equal(core.generateBadge({ icon: 'none', scale: Infinity }), fallback);
  assert.equal(core.generateBadge({ icon: 'none', scale: NaN }), fallback);
  assert.equal(core.generateBadge({ icon: 'none', labelBg: 'red' }), fallback);
  assert.match(core.generateBadge({ icon: 'none', scale: 0 }), /height="17"/);
  assert.match(core.generateBadge({ icon: 'none', label: '🚀'.repeat(41) }), new RegExp(`<title>${'🚀'.repeat(40)}: passing</title>`, 'u'));
});

test('custom icons require bounded canonical image data or valid HTTPS URLs', () => {
  assert.equal(core.validateIconData(PNG), PNG);
  for (const data of [
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/png;base64,',
    'data:image/png;base64,A===',
    'data:image/png;base64,AA==\n',
    'data:image/png;base64,' + 'A'.repeat(200_000),
  ]) assert.equal(core.validateIconData(data), null);

  assert.equal(core.getHttpsIconUrl('http://example.com/icon.png'), null);
  assert.equal(core.getHttpsIconUrl('https://user:secret@example.com/icon.png'), null);
  assert.equal(core.getHttpsIconUrl('not a url'), null);
  assert.equal(core.getHttpsIconUrl('HTTPS://Example.com/icon.png'), 'https://example.com/icon.png');
  assert.match(core.generateBadge({ iconUrl: 'https://example.com/icon.svg?x=1&y=2' }), /href="https:\/\/example.com\/icon.svg\?x=1&amp;y=2"/);
  assert.doesNotMatch(core.generateBadge({ iconUrl: 'javascript:alert(1)' }), /<image /);
});

test('theme controls remain usable when browser storage is disabled', () => {
  const root = path.join(__dirname, '..');
  const html = {
    theme: 'dark',
    getAttribute() { return this.theme; },
    setAttribute(_name, value) { this.theme = value; },
  };
  let toggle;
  const context = {
    document: {
      documentElement: html,
      addEventListener() {},
      getElementById() { return { addEventListener(_name, callback) { toggle = callback; } }; },
    },
    localStorage: {
      getItem() { throw new Error('Storage disabled'); },
      setItem() { throw new Error('Storage disabled'); },
    },
    URL,
  };
  const scripts = fs.readFileSync(path.join(root, 'badge-core.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\ninitThemeToggle();';
  vm.runInNewContext(scripts, context);
  toggle();
  assert.equal(html.theme, 'light');
});

test('browser exports escape HTML attributes and Markdown alt text', () => {
  const root = path.join(__dirname, '..');
  const context = { document: { addEventListener() {} }, URL };
  const scripts = fs.readFileSync(path.join(root, 'badge-core.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\nthis.getEmbedOutputs = getEmbedOutputs;';
  vm.runInNewContext(scripts, context);

  const { html, markdown } = context.getEmbedOutputs(
    { label: '"/><img src=x onerror=1> [a]', value: 'value & more', theme: 'dark' },
    'https://example.com',
  );
  assert.match(html, /alt="&quot;\/&gt;&lt;img src=x onerror=1&gt; \[a\]: value &amp; more"/);
  assert.match(html, /src="https:\/\/example.com\/api\/badge\?label=.*&amp;value=/);
  assert.match(markdown, /\\\[a\\\]/);
  assert.doesNotMatch(html, /alt=""\/><img/);
});
