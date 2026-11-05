'use strict';

// Shared by the browser preview and the Vercel endpoint.
const BadgeCore = (() => {
  const FONT = 'Verdana,DejaVu Sans,sans-serif';
  const MAX_ICON_DATA_LEN = 200_000;

  const STYLES = {
    flat: { radius: 4, fontSize: 11, fontWeight: '600', padX: 10, height: 24, uppercase: false, borderWidth: 0 },
    'flat-square': { radius: 0, fontSize: 11, fontWeight: '600', padX: 10, height: 24, uppercase: false, borderWidth: 0 },
    'for-the-badge': { radius: 4, fontSize: 12, fontWeight: '700', padX: 12, height: 28, uppercase: true, borderWidth: 0 },
    plastic: { radius: 4, fontSize: 11, fontWeight: '700', padX: 10, height: 24, uppercase: false, borderWidth: 1 },
    social: { radius: 3, fontSize: 11, fontWeight: '600', padX: 10, height: 24, uppercase: false, borderWidth: 1 },
    rounded: { radius: 12, fontSize: 11, fontWeight: '600', padX: 11, height: 24, uppercase: false, borderWidth: 0 },
    pill: { radius: 999, fontSize: 11, fontWeight: '700', padX: 12, height: 24, uppercase: false, borderWidth: 0 },
    outline: { radius: 6, fontSize: 11, fontWeight: '600', padX: 10, height: 24, uppercase: false, borderWidth: 1 },
    soft: { radius: 8, fontSize: 11, fontWeight: '600', padX: 11, height: 24, uppercase: false, borderWidth: 0 },
  };

  const THEMES = {
    dark: { labelBg: '#1f2937', labelText: '#f3f4f6', valueBg: '#111827', valueText: '#93c5fd', border: '#374151' },
    light: { labelBg: '#f3f4f6', labelText: '#111827', valueBg: '#ffffff', valueText: '#1d4ed8', border: '#d1d5db' },
    neon: { labelBg: '#151026', labelText: '#67e8f9', valueBg: '#1e1237', valueText: '#c4b5fd', border: '#7c3aed' },
    sunset: { labelBg: '#7c2d12', labelText: '#ffedd5', valueBg: '#9a3412', valueText: '#fde68a', border: '#fdba74' },
    terminal: { labelBg: '#052e16', labelText: '#dcfce7', valueBg: '#14532d', valueText: '#86efac', border: '#22c55e' },
  };

  const SIZES = { xs: 0.82, sm: 0.92, md: 1.0, lg: 1.16, xl: 1.32 };
  const ICONS = {
    none: '', star: '★', heart: '❤', check: '✓', fire: '🔥',
    bolt: '⚡', rocket: '🚀', code: '⌘', build: '⚙', docs: '📘',
  };

  const HEX_RE = /^#[0-9a-fA-F]{6}$/;
  const DATA_URI_RE = /^data:image\/(?:png|jpeg|gif|svg\+xml|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  const INVALID_XML_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu;

  function escapeXml(value) {
    return String(value).replace(INVALID_XML_RE, '\uFFFD')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isHex(value) {
    return typeof value === 'string' && HEX_RE.test(value.trim());
  }

  function getOption(options, key, fallback) {
    return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
  }

  function validateIconData(dataUri) {
    if (typeof dataUri !== 'string' || dataUri.endsWith(',') || dataUri.length > MAX_ICON_DATA_LEN) return null;
    const match = DATA_URI_RE.exec(dataUri);
    return match && match[0].length === dataUri.length ? dataUri : null;
  }

  function getHttpsIconUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  }

  function textWidth(text, fontSize) {
    const multiplier = fontSize >= 12 ? 0.62 : 0.58;
    return Math.floor(Math.max(1, Array.from(text).length) * fontSize * multiplier);
  }

  function generateBadge(opts = {}) {
    const {
      label = 'build', value = 'passing', icon = 'none', iconData = '', iconUrl = '',
      style = 'flat', theme = 'dark', size = 'md', scale = 1.0,
      labelBg = '', valueBg = '', labelColor = '', valueColor = '', borderColor = '',
      borderRadius = null, gradient = false, uppercase = false, compact = false,
    } = opts;

    const profile = getOption(STYLES, style, STYLES.flat);
    const palette = getOption(THEMES, theme, THEMES.dark);
    const activeUppercase = profile.uppercase || uppercase;
    const rawLabel = Array.from(String(label || 'label')).slice(0, 40).join('');
    const rawValue = Array.from(String(value || 'value')).slice(0, 52).join('');

    const customIconHref = getHttpsIconUrl(iconUrl) || validateIconData(iconData);
    const symbol = customIconHref ? '' : getOption(ICONS, icon, '');
    const fullLabelText = symbol ? `${symbol} ${rawLabel}`.trim() : rawLabel;

    const lbg = isHex(labelBg) ? labelBg.trim() : palette.labelBg;
    const vbg = isHex(valueBg) ? valueBg.trim() : palette.valueBg;
    const ltxt = isHex(labelColor) ? labelColor.trim() : palette.labelText;
    const vtxt = isHex(valueColor) ? valueColor.trim() : palette.valueText;
    const bdr = isHex(borderColor) ? borderColor.trim() : palette.border;

    const sizeFactor = getOption(SIZES, size, 1.0);
    const parsedScale = Number.parseFloat(String(scale));
    const scaleFactor = Number.isFinite(parsedScale) ? Math.min(Math.max(parsedScale, 0.7), 2.0) : 1.0;
    const factor = sizeFactor * scaleFactor * (compact ? 0.88 : 1.0);
    const baseRadius = borderRadius !== null
      ? Math.min(Math.max(Number.parseInt(String(borderRadius), 10) || 0, 0), 999)
      : profile.radius;

    const height = Math.max(16, Math.round(profile.height * factor));
    const padX = Math.max(5, Math.round(profile.padX * factor));
    const fontSize = Math.max(9, Math.round(profile.fontSize * factor));
    const radius = Math.min(Math.round(baseRadius * factor), Math.floor(height / 2));

    const iconSize = customIconHref ? Math.round(height * 0.65) : 0;
    const iconPad = customIconHref ? Math.round(iconSize * 0.4) : 0;
    const iconTotalSpace = iconSize + iconPad;
    const labelRender = activeUppercase ? fullLabelText.toUpperCase() : fullLabelText;
    const valueRender = activeUppercase ? rawValue.toUpperCase() : rawValue;
    const labelWidth = textWidth(labelRender, fontSize);
    const leftWidth = labelWidth + 2 * padX + iconTotalSpace;
    const rightWidth = textWidth(valueRender, fontSize) + 2 * padX;
    const totalWidth = leftWidth + rightWidth;

    const isOutline = style === 'outline';
    const leftFill = isOutline ? 'none' : lbg;
    const rightFill = isOutline ? 'none' : vbg;
    const borderAttr = profile.borderWidth > 0
      ? ` stroke="${bdr}" stroke-width="${profile.borderWidth}"` : '';

    let defs = '';
    let overlay = '';
    if (gradient) {
      defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.42"/>
<stop offset="0.49" stop-color="#ffffff" stop-opacity="0.10"/>
<stop offset="0.5" stop-color="#000000" stop-opacity="0.10"/>
<stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
</linearGradient></defs>`;
      overlay = `<rect x="0" y="0" width="${totalWidth}" height="${height}" fill="url(#g)" rx="${radius}" ry="${radius}"/>`;
    }

    const textY = (height / 2) + (fontSize * 0.33);
    let iconSvg = '';
    let labelTextX = leftWidth / 2;
    if (customIconHref) {
      const ix = padX;
      const iy = (height - iconSize) / 2;
      iconSvg = `<image x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" href="${escapeXml(customIconHref)}"/>`;
      labelTextX = iconTotalSpace + padX + labelWidth / 2;
    }

    const junctionX = Math.max(0, leftWidth - radius);
    const junctionFill = isOutline ? 'none' : lbg;

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}" role="img" aria-label="${escapeXml(labelRender)}: ${escapeXml(valueRender)}">
<title>${escapeXml(labelRender)}: ${escapeXml(valueRender)}</title>
${defs}
<rect x="0" y="0" width="${leftWidth}" height="${height}" fill="${leftFill}" rx="${radius}" ry="${radius}"${borderAttr}/>
<rect x="${leftWidth}" y="0" width="${rightWidth}" height="${height}" fill="${rightFill}" rx="${radius}" ry="${radius}"${borderAttr}/>
<rect x="${junctionX}" y="0" width="${radius}" height="${height}" fill="${junctionFill}"/>
${iconSvg}
<text x="${labelTextX}" y="${textY.toFixed(1)}" fill="${ltxt}" font-size="${fontSize}" font-family="${FONT}" font-weight="${profile.fontWeight}" text-anchor="middle">${escapeXml(labelRender)}</text>
<text x="${leftWidth + rightWidth / 2}" y="${textY.toFixed(1)}" fill="${vtxt}" font-size="${fontSize}" font-family="${FONT}" font-weight="${profile.fontWeight}" text-anchor="middle">${escapeXml(valueRender)}</text>
${overlay}
</svg>`.trim();
  }

  return { STYLES, THEMES, SIZES, ICONS, MAX_ICON_DATA_LEN, escapeXml, isHex, getHttpsIconUrl, validateIconData, generateBadge };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = BadgeCore;
