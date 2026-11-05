'use strict';

// Browser controls; badge-core.js provides the renderer shared with the API.

const { STYLES, THEMES, SIZES, ICONS, generateBadge, isHex, escapeXml, getHttpsIconUrl } = BadgeCore;
const STYLE_ORDER = Object.keys(STYLES);
const THEME_ORDER = Object.keys(THEMES);
const SIZE_ORDER = Object.keys(SIZES);
const ICON_ORDER = Object.keys(ICONS);

/** Presets — match data_fetchers.py BADGE_PRESETS */
const PRESETS = {
  build:    { label: 'build',    value: 'passing', icon: 'check',  theme: 'terminal', style: 'flat',          size: 'md' },
  coverage: { label: 'coverage', value: '98%',     icon: 'bolt',   theme: 'dark',     style: 'plastic',       size: 'md' },
  release:  { label: 'release',  value: 'v2.0.0',  icon: 'rocket', theme: 'sunset',   style: 'for-the-badge', size: 'lg' },
  docs:     { label: 'docs',     value: 'stable',  icon: 'docs',   theme: 'light',    style: 'social',        size: 'md' },
  quality:  { label: 'quality',  value: 'A+',      icon: 'star',   theme: 'neon',     style: 'pill',          size: 'sm' },
};

const COLOR_PALETTE = [
  '#111827','#1f2937','#374151','#4b5563','#6b7280','#9ca3af',
  '#ffffff','#f3f4f6','#1d4ed8','#2563eb','#0ea5e9','#06b6d4',
  '#7c3aed','#a855f7','#db2777','#ef4444','#f97316','#f59e0b',
  '#84cc16','#22c55e','#10b981','#14b8a6','#8b5cf6','#ec4899',
];

/* ═══════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_STATE = {
  label:        'build',
  value:        'passing',
  icon:         'check',
  iconData:     '',
  iconUrl:      '',
  style:        'flat',
  theme:        'terminal',
  size:         'md',
  scale:        1.0,
  labelBg:      '',
  valueBg:      '',
  labelColor:   '',
  valueColor:   '',
  borderColor:  '',
  borderRadius: null,
  gradient:     false,
  uppercase:    false,
  compact:      false,
  activePreset: 'build',
};

let state = { ...DEFAULT_STATE };
let iconSelection = 0;

/* ═══════════════════════════════════════════════════════════════
   UI HELPERS
   ═══════════════════════════════════════════════════════════════ */

/** Show a short toast message */
function showToast(msg, duration = 2000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

/** Copy text to clipboard with feedback */
async function copyText(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied!`);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      // Clipboard APIs are unavailable in this browser context.
    } finally {
      ta.remove();
    }
    showToast(copied ? `${label} copied!` : 'Unable to copy text');
  }
}

/** Trigger an SVG file download */
function downloadSVG(svgString, filename = 'badge.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('SVG downloaded!');
}

/** Pop animation on preview */
function popPreview() {
  const wrap = document.getElementById('previewSvgWrap');
  wrap.classList.remove('pop');
  void wrap.offsetWidth; // reflow
  wrap.classList.add('pop');
  setTimeout(() => wrap.classList.remove('pop'), 120);
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — build badge and push to DOM
   ═══════════════════════════════════════════════════════════════ */

let currentSvg = '';
let galleryFrame = 0;

function getEmbedOutputs(options, origin) {
  const label = options.label || 'label';
  const value = options.value || 'value';
  const alt = `${label}: ${value}`;
  const apiUrl = new URL('/api/badge', origin);
  const query = apiUrl.searchParams;

  query.set('label', label);
  query.set('value', value);
  query.set('style', options.style || 'flat');
  query.set('theme', options.theme || 'dark');
  query.set('size', options.size || 'md');
  query.set('icon', options.icon || 'none');
  query.set('scale', String(options.scale ?? 1));

  const iconUrl = getHttpsIconUrl(options.iconUrl);
  if (iconUrl) query.set('iconUrl', iconUrl);
  if (options.iconData && !iconUrl) query.set('iconData', options.iconData);
  for (const key of ['labelBg', 'valueBg', 'labelColor', 'valueColor', 'borderColor']) {
    if (options[key]) query.set(key, options[key]);
  }
  if (options.borderRadius !== null && options.borderRadius !== undefined) {
    query.set('borderRadius', String(options.borderRadius));
  }
  if (options.gradient) query.set('gradient', '1');
  if (options.uppercase) query.set('uppercase', '1');
  if (options.compact) query.set('compact', '1');

  const url = apiUrl.toString();
  const markdownAlt = alt.replace(/[\\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ');
  return {
    markdown: `![${markdownAlt}](${url})`,
    html: `<img src="${escapeXml(url)}" alt="${escapeXml(alt)}" />`,
  };
}

function render() {
  const svg = generateBadge(state);
  currentSvg = svg;

  /* Preview */
  const wrap = document.getElementById('previewSvgWrap');
  wrap.innerHTML = svg;
  popPreview();

  /* Dimensions */
  const svgEl = wrap.querySelector('svg');
  if (svgEl) {
    document.getElementById('badgeDimensions').textContent =
      `${svgEl.getAttribute('width')} × ${svgEl.getAttribute('height')} px`;
  }

  const outputs = getEmbedOutputs(state, window.location.origin);
  document.getElementById('outputMarkdown').value = outputs.markdown;
  document.getElementById('outputHtml').value = outputs.html;
  document.getElementById('outputSvg').value = svg;

  if (!galleryFrame) {
    galleryFrame = requestAnimationFrame(() => {
      galleryFrame = 0;
      updateGalleries();
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   GALLERIES — show badge in all styles / all themes
   ═══════════════════════════════════════════════════════════════ */

function buildGalleryItem(svg, labelText, clickFn) {
  const div = document.createElement('div');
  div.className = 'gallery-item';
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.innerHTML = svg;
  const span = document.createElement('span');
  span.className = 'gallery-item-label';
  span.textContent = labelText;
  div.appendChild(span);
  div.addEventListener('click', clickFn);
  div.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clickFn();
    }
  });
  return div;
}

function updateGalleries() {
  const baseOpts = {
    label:       state.label,
    value:       state.value,
    icon:        state.icon,
    iconData:    state.iconData,
    iconUrl:     state.iconUrl,
    size:        'md',
    scale:       1.0,
    gradient:    state.gradient,
    uppercase:   state.uppercase,
    compact:     state.compact,
    labelBg:     '',
    valueBg:     '',
    labelColor:  '',
    valueColor:  '',
    borderColor: '',
    borderRadius: null,
  };

  const styleItems = STYLE_ORDER.map(styleName => {
    const svg = generateBadge({ ...baseOpts, style: styleName, theme: state.theme });
    return buildGalleryItem(svg, styleName, () => {
      state.style = styleName;
      state.borderRadius = null;
      document.getElementById('inputStyle').value = styleName;
      syncRadiusField();
      render();
    });
  });
  document.getElementById('galleryStyles').replaceChildren(...styleItems);

  const themeItems = THEME_ORDER.map(themeName => {
    const svg = generateBadge({ ...baseOpts, style: state.style, theme: themeName });
    return buildGalleryItem(svg, themeName, () => {
      state.theme = themeName;
      document.getElementById('inputTheme').value = themeName;
      state.labelBg = state.valueBg = state.labelColor = state.valueColor = state.borderColor = '';
      syncColorFieldsFromTheme();
      render();
    });
  });
  document.getElementById('galleryThemes').replaceChildren(...themeItems);
}

/* ═══════════════════════════════════════════════════════════════
   COLOR SYNC — text inputs ↔ color pickers ↔ palette
   ═══════════════════════════════════════════════════════════════ */

const COLOR_FIELDS = [
  { key: 'labelBg',     inputId: 'inputLabelBg',     pickerId: 'pickerLabelBg'     },
  { key: 'valueBg',     inputId: 'inputValueBg',      pickerId: 'pickerValueBg'     },
  { key: 'labelColor',  inputId: 'inputLabelColor',   pickerId: 'pickerLabelColor'  },
  { key: 'valueColor',  inputId: 'inputValueColor',   pickerId: 'pickerValueColor'  },
  { key: 'borderColor', inputId: 'inputBorderColor',  pickerId: 'pickerBorderColor' },
];

let activeColorField = 'labelBg'; // which field receives palette clicks

function getColorDefault(key) {
  const theme = THEMES[state.theme] || THEMES['dark'];
  const map = { labelBg: 'labelBg', valueBg: 'valueBg', labelColor: 'labelText', valueColor: 'valueText', borderColor: 'border' };
  return theme[map[key]] || '#000000';
}

function syncColorFieldsFromTheme() {
  for (const { key, inputId, pickerId } of COLOR_FIELDS) {
    const val = state[key] || getColorDefault(key);
    document.getElementById(inputId).value   = val;
    document.getElementById(pickerId).value  = isHex(val) ? val : getColorDefault(key);
  }
}

function applyColorToField(key, hex) {
  state[key] = hex;
  const cf = COLOR_FIELDS.find(f => f.key === key);
  if (cf) {
    document.getElementById(cf.inputId).value  = hex;
    document.getElementById(cf.pickerId).value = hex;
  }
  render();
}

function initColorSync() {
  for (const { key, inputId, pickerId } of COLOR_FIELDS) {
    const textEl   = document.getElementById(inputId);
    const pickerEl = document.getElementById(pickerId);
    const fieldEl  = textEl.closest('[data-color-field]');

    /* Focus tracking → determines which field gets palette clicks */
    const markActive = () => {
      activeColorField = key;
      document.querySelectorAll('[data-color-field]').forEach(el => el.classList.remove('focused'));
      if (fieldEl) fieldEl.classList.add('focused');
    };

    textEl.addEventListener('focus', markActive);
    pickerEl.addEventListener('focus', markActive);

    /* Text input → validate hex → sync picker + state */
    textEl.addEventListener('input', () => {
      markActive();
      const v = textEl.value.trim();
      if (isHex(v)) {
        pickerEl.value = v;
        state[key] = v;
        render();
      } else if (v === '') {
        state[key] = '';
        render();
      }
    });

    /* Color picker → sync text + state */
    pickerEl.addEventListener('input', () => {
      markActive();
      const v = pickerEl.value;
      textEl.value = v;
      state[key] = v;
      render();
    });
  }

  /* Palette dots */
  const paletteGrid = document.getElementById('paletteGrid');
  for (const hex of COLOR_PALETTE) {
    const dot = document.createElement('button');
    dot.className = 'palette-dot';
    dot.style.background = hex;
    dot.title = hex;
    dot.setAttribute('aria-label', `Apply color ${hex}`);
    dot.addEventListener('click', () => applyColorToField(activeColorField, hex));
    paletteGrid.appendChild(dot);
  }
}

/* ═══════════════════════════════════════════════════════════════
   ICON PICKER
   ═══════════════════════════════════════════════════════════════ */

function initIconPicker() {
  const grid = document.getElementById('iconPickerGrid');

  for (const key of ICON_ORDER) {
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.dataset.icon = key;
    btn.title = key;
    btn.setAttribute('aria-label', `Icon: ${key}`);
    btn.textContent = key === 'none' ? '∅' : (ICONS[key] || key);
    if (key === state.icon) btn.classList.add('active');

    btn.addEventListener('click', () => {
      iconSelection++;
      state.icon = key;
      state.iconData = '';
      state.iconUrl = '';
      document.getElementById('iconUrlInput').value = '';
      document.getElementById('iconFileInput').value = '';
      const preview = document.getElementById('iconPreviewImg');
      preview.removeAttribute('src');
      preview.hidden = true;
      document.getElementById('iconClearBtn').hidden = true;
      grid.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });

    grid.appendChild(btn);
  }

  /* File upload */
  const fileInput    = document.getElementById('iconFileInput');
  const previewImg   = document.getElementById('iconPreviewImg');
  const clearBtn     = document.getElementById('iconClearBtn');
  const iconUrlInput = document.getElementById('iconUrlInput');

  fileInput.addEventListener('change', () => {
    const selection = ++iconSelection;
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      fileInput.value = '';
      showToast('Choose an image smaller than 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      if (iconSelection === selection) showToast('Unable to read the image');
    };
    reader.onload = () => {
      if (iconSelection !== selection) return;
      const img = new Image();
      img.onerror = () => {
        if (iconSelection === selection) showToast('Unable to decode the image');
      };
      img.onload = () => {
        if (iconSelection !== selection) return;
        try {
          if (!img.width || !img.height || img.width > 4096 || img.height > 4096) {
            throw new Error('Invalid image dimensions');
          }
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 32;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas is unavailable');
          const scale = Math.min(32 / img.width, 32 / img.height);
          const width = img.width * scale;
          const height = img.height * scale;
          ctx.drawImage(img, (32 - width) / 2, (32 - height) / 2, width, height);
          const dataUrl = canvas.toDataURL('image/png');

          state.iconData = dataUrl;
          state.iconUrl = '';
          state.icon = 'none';
          iconUrlInput.value = '';
          previewImg.src = dataUrl;
          previewImg.hidden = false;
          clearBtn.hidden = false;
          grid.querySelectorAll('.icon-btn').forEach(button => button.classList.remove('active'));
          render();
        } catch {
          showToast('Unable to process the image');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  /* Icon URL input */
  iconUrlInput.addEventListener('input', () => {
    iconSelection++;
    const url = iconUrlInput.value.trim();
    state.iconUrl = url;
    state.iconData = '';
    fileInput.value = '';
    if (url) {
      state.icon = 'none';
      grid.querySelectorAll('.icon-btn').forEach(button => button.classList.remove('active'));
    }
    const safeUrl = getHttpsIconUrl(url);
    if (safeUrl) previewImg.src = safeUrl;
    else previewImg.removeAttribute('src');
    previewImg.hidden = !safeUrl;
    clearBtn.hidden = !url;
    render();
  });

  clearBtn.addEventListener('click', () => {
    iconSelection++;
    state.iconData  = '';
    state.iconUrl   = '';
    iconUrlInput.value = '';
    fileInput.value = '';
    previewImg.removeAttribute('src');
    previewImg.hidden = true;
    clearBtn.hidden   = true;
    /* Re-activate default icon */
    const defaultBtn = grid.querySelector('[data-icon="none"]');
    if (defaultBtn) defaultBtn.classList.add('active');
    state.icon = 'none';
    render();
  });
}

/* ═══════════════════════════════════════════════════════════════
   PRESETS
   ═══════════════════════════════════════════════════════════════ */

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  state.activePreset = name;
  state.label        = p.label;
  state.value        = p.value;
  state.icon         = p.icon;
  state.iconData     = '';
  state.iconUrl      = '';
  state.style        = p.style;
  state.theme        = p.theme;
  state.size         = p.size || 'md';
  state.scale        = 1.0;
  state.gradient     = false;
  state.uppercase    = false;
  state.compact      = false;
  state.borderRadius = null;
  state.labelBg      = '';
  state.valueBg      = '';
  state.labelColor   = '';
  state.valueColor   = '';
  state.borderColor  = '';

  syncAllFieldsFromState();
  render();
}

function initPresets() {
  const grid = document.getElementById('presetGrid');
  for (const name of Object.keys(PRESETS)) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.dataset.preset = name;
    btn.textContent = name;
    if (name === state.activePreset) btn.classList.add('active');

    btn.addEventListener('click', () => {
      grid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(name);
    });

    grid.appendChild(btn);
  }
}

/* ═══════════════════════════════════════════════════════════════
   SYNC ALL FIELDS → DOM (called after preset or reset)
   ═══════════════════════════════════════════════════════════════ */

function syncRadiusField() {
  const input = document.getElementById('inputRadius');
  const radius = state.borderRadius ?? STYLES[state.style].radius;
  const displayRadius = Math.min(radius, Number(input.max));
  input.value = displayRadius;
  document.getElementById('radiusVal').textContent = displayRadius;
}

function syncAllFieldsFromState() {
  iconSelection++;
  document.getElementById('inputLabel').value       = state.label;
  document.getElementById('inputValue').value       = state.value;
  document.getElementById('inputStyle').value       = state.style;
  document.getElementById('inputTheme').value       = state.theme;
  document.getElementById('inputSize').value        = state.size;
  document.getElementById('inputScale').value       = state.scale;
  document.getElementById('scaleVal').textContent   = `${parseFloat(state.scale).toFixed(2)}×`;

  syncRadiusField();

  document.getElementById('optGradient').checked   = state.gradient;
  document.getElementById('optUppercase').checked  = state.uppercase;
  document.getElementById('optCompact').checked    = state.compact;

  /* Icon picker */
  document.querySelectorAll('.icon-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.icon === state.icon);
  });

  /* Clear custom icon */
  document.getElementById('iconUrlInput').value = state.iconUrl || '';
  if (!state.iconData && !state.iconUrl) {
    const fi = document.getElementById('iconFileInput');
    if (fi) fi.value = '';
    const preview = document.getElementById('iconPreviewImg');
    preview.removeAttribute('src');
    preview.hidden = true;
    document.getElementById('iconClearBtn').hidden = true;
  }

  /* Colors */
  syncColorFieldsFromTheme();

  /* Preset buttons */
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.preset === state.activePreset);
  });
}

/* ═══════════════════════════════════════════════════════════════
   FORM WIRING — connect every control to state + re-render
   ═══════════════════════════════════════════════════════════════ */

function initFormWiring() {
  /* Text inputs */
  const textFields = [
    ['inputLabel',  'label'],
    ['inputValue',  'value'],
  ];
  for (const [id, key] of textFields) {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      render();
    });
  }

  /* Selects */
  const selectFields = [
    ['inputStyle', 'style'],
    ['inputTheme', 'theme'],
    ['inputSize',  'size'],
  ];
  for (const [id, key] of selectFields) {
    /* Populate select options */
    const el = document.getElementById(id);
    const lists = { inputStyle: STYLE_ORDER, inputTheme: THEME_ORDER, inputSize: SIZE_ORDER };
    for (const opt of lists[id]) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      el.appendChild(option);
    }
    el.value = state[key];
    el.addEventListener('change', (e) => {
      state[key] = e.target.value;
      if (key === 'style') {
        /* Reset border radius to style default when style changes */
        state.borderRadius = null;
        syncRadiusField();
      }
      if (key === 'theme') {
        state.labelBg = state.valueBg = state.labelColor = state.valueColor = state.borderColor = '';
        syncColorFieldsFromTheme();
      }
      render();
    });
  }

  /* Scale range */
  const scaleEl = document.getElementById('inputScale');
  scaleEl.addEventListener('input', () => {
    state.scale = parseFloat(scaleEl.value);
    document.getElementById('scaleVal').textContent = `${state.scale.toFixed(2)}×`;
    render();
  });

  /* Border radius range */
  const radiusEl = document.getElementById('inputRadius');
  radiusEl.addEventListener('input', () => {
    state.borderRadius = parseInt(radiusEl.value, 10);
    document.getElementById('radiusVal').textContent = radiusEl.value;
    render();
  });

  /* Checkboxes */
  const checkFields = [
    ['optGradient',  'gradient'],
    ['optUppercase', 'uppercase'],
    ['optCompact',   'compact'],
  ];
  for (const [id, key] of checkFields) {
    document.getElementById(id).addEventListener('change', (e) => {
      state[key] = e.target.checked;
      render();
    });
  }
}

function initControlSections() {
  const sections = Array.from(document.querySelectorAll('.ctrl-section'));

  sections.forEach(section => {
    section.open = false;
    section.addEventListener('toggle', () => {
      if (!section.open) return;
      sections.forEach(other => {
        if (other !== section) other.open = false;
      });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   ACTION BUTTONS
   ═══════════════════════════════════════════════════════════════ */

function initActions() {
  document.getElementById('btnCopySvg').addEventListener('click', () => {
    copyText(currentSvg, 'SVG');
  });

  document.getElementById('btnCopyMarkdown').addEventListener('click', () => {
    copyText(document.getElementById('outputMarkdown').value, 'Markdown');
  });

  document.getElementById('btnDownloadSvg').addEventListener('click', () => {
    const slug = (state.label || 'label').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'label';
    downloadSVG(currentSvg, `badge-${slug}.svg`);
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    state = { ...DEFAULT_STATE };
    syncAllFieldsFromState();
    render();
    showToast('Reset to defaults');
  });

  /* Inline copy buttons next to textareas */
  document.querySelectorAll('.output-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ta = document.getElementById(btn.dataset.target);
      if (ta) copyText(ta.value, btn.closest('.output-group')?.querySelector('.output-label')?.textContent?.trim() || 'Text');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   PREVIEW BACKGROUND SWITCHER
   ═══════════════════════════════════════════════════════════════ */

function initPreviewBg() {
  const stage   = document.getElementById('previewStage');
  const buttons = document.querySelectorAll('.bg-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      stage.className = `preview-stage ${btn.dataset.bg}`;
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   DARK / LIGHT MODE TOGGLE
   ═══════════════════════════════════════════════════════════════ */

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  const html = document.documentElement;
  try {
    if (localStorage.getItem('badge-forge-theme') === 'light') {
      html.setAttribute('data-theme', 'light');
    }
  } catch {
    // Storage may be unavailable in private or sandboxed contexts.
  }

  btn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try {
      localStorage.setItem('badge-forge-theme', next);
    } catch {
      // The current theme still works when storage is unavailable.
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   INITIALISE
   ═══════════════════════════════════════════════════════════════ */

function init() {
  initThemeToggle();
  initControlSections();
  initPresets();
  initFormWiring();
  initColorSync();
  initIconPicker();
  initActions();
  initPreviewBg();

  /* Set initial state to 'build' preset */
  applyPreset('build');
}

document.addEventListener('DOMContentLoaded', init);
