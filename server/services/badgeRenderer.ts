/** SVG rendering for the optional Express API. */

const FONT = "Verdana,DejaVu Sans,sans-serif";

// ── Style definitions ──

interface StyleProfile {
  radius: number;
  fontSize: number;
  fontWeight: string;
  padX: number;
  height: number;
  uppercase: boolean;
  borderWidth: number;
}

const STYLES: Record<string, StyleProfile> = {
  flat:            { radius: 4,   fontSize: 11, fontWeight: "600", padX: 10, height: 24, uppercase: false, borderWidth: 0 },
  "flat-square":   { radius: 0,   fontSize: 11, fontWeight: "600", padX: 10, height: 24, uppercase: false, borderWidth: 0 },
  "for-the-badge": { radius: 4,   fontSize: 12, fontWeight: "700", padX: 12, height: 28, uppercase: true,  borderWidth: 0 },
  plastic:         { radius: 4,   fontSize: 11, fontWeight: "700", padX: 10, height: 24, uppercase: false, borderWidth: 1 },
  social:          { radius: 3,   fontSize: 11, fontWeight: "600", padX: 10, height: 24, uppercase: false, borderWidth: 1 },
  rounded:         { radius: 12,  fontSize: 11, fontWeight: "600", padX: 11, height: 24, uppercase: false, borderWidth: 0 },
  pill:            { radius: 999, fontSize: 11, fontWeight: "700", padX: 12, height: 24, uppercase: false, borderWidth: 0 },
  outline:         { radius: 6,   fontSize: 11, fontWeight: "600", padX: 10, height: 24, uppercase: false, borderWidth: 1 },
  soft:            { radius: 8,   fontSize: 11, fontWeight: "600", padX: 11, height: 24, uppercase: false, borderWidth: 0 },
};

// ── Theme definitions ──

interface ThemePalette {
  labelBg: string;
  labelText: string;
  valueBg: string;
  valueText: string;
  border: string;
}

const THEMES: Record<string, ThemePalette> = {
  dark:     { labelBg: "#1f2937", labelText: "#f3f4f6", valueBg: "#111827", valueText: "#93c5fd", border: "#374151" },
  light:    { labelBg: "#f3f4f6", labelText: "#111827", valueBg: "#ffffff", valueText: "#1d4ed8", border: "#d1d5db" },
  neon:     { labelBg: "#151026", labelText: "#67e8f9", valueBg: "#1e1237", valueText: "#c4b5fd", border: "#7c3aed" },
  sunset:   { labelBg: "#7c2d12", labelText: "#ffedd5", valueBg: "#9a3412", valueText: "#fde68a", border: "#fdba74" },
  terminal: { labelBg: "#052e16", labelText: "#dcfce7", valueBg: "#14532d", valueText: "#86efac", border: "#22c55e" },
};

// ── Size multipliers ──

const SIZES: Record<string, number> = { xs: 0.82, sm: 0.92, md: 1.0, lg: 1.16, xl: 1.32 };

// ── Built-in icons ──

const ICONS: Record<string, string> = {
  none: "", star: "\u2605", heart: "\u2764", check: "\u2713",
  fire: "\uD83D\uDD25", bolt: "\u26A1", rocket: "\uD83D\uDE80",
  code: "\u2318", build: "\u2699", docs: "\uD83D\uDCD8",
};

// ── Presets ──

export interface BadgePreset {
  label: string;
  value: string;
  icon: string;
  theme: string;
  style: string;
  size: string;
}

export const PRESETS: Record<string, BadgePreset> = {
  build:    { label: "build",    value: "passing", icon: "check",  theme: "terminal", style: "flat",          size: "md" },
  coverage: { label: "coverage", value: "98%",     icon: "bolt",   theme: "dark",     style: "plastic",       size: "md" },
  release:  { label: "release",  value: "v2.0.0",  icon: "rocket", theme: "sunset",   style: "for-the-badge", size: "lg" },
  docs:     { label: "docs",     value: "stable",  icon: "docs",   theme: "light",    style: "social",        size: "md" },
  quality:  { label: "quality",  value: "A+",      icon: "star",   theme: "neon",     style: "pill",          size: "sm" },
};

// ── Helpers ──

function esc(s: string): string {
  return String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu, "\uFFFD")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function getOption<T>(options: Record<string, T>, key: string, fallback: T): T {
  return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
}

function isHex(s: string | undefined | null): boolean {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s.trim());
}

function textWidth(text: string, fontSize: number): number {
  const multiplier = fontSize >= 12 ? 0.62 : 0.58;
  return Math.floor(Math.max(1, Array.from(text).length) * fontSize * multiplier);
}

const DATA_URI_RE = /^data:image\/(?:png|jpeg|gif|svg\+xml|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
export const MAX_ICON_DATA_LEN = 200_000;

export function validateIconData(dataUri: string | undefined | null): string | null {
  if (typeof dataUri !== "string" || dataUri.endsWith(",") || dataUri.length > MAX_ICON_DATA_LEN) return null;
  const match = DATA_URI_RE.exec(dataUri);
  return match && match[0].length === dataUri.length ? dataUri : null;
}

export function getBuiltinIcon(slug: string): string | null {
  return Object.prototype.hasOwnProperty.call(ICONS, slug) ? ICONS[slug] : null;
}

// ── Badge generation parameters ──

export interface BadgeParams {
  label?: string;
  value?: string;
  icon?: string;
  iconData?: string;
  style?: string;
  theme?: string;
  size?: string;
  scale?: number;
  labelBg?: string;
  valueBg?: string;
  labelColor?: string;
  valueColor?: string;
  borderColor?: string;
  borderRadius?: number | null;
  gradient?: boolean;
  uppercase?: boolean;
  compact?: boolean;
}

// ── Main badge generation function ──

export function generateBadge(opts: BadgeParams = {}): string {
  const {
    label = "build",
    value = "passing",
    icon = "none",
    iconData = "",
    style = "flat",
    theme = "dark",
    size = "md",
    scale = 1.0,
    labelBg = "",
    valueBg = "",
    labelColor = "",
    valueColor = "",
    borderColor = "",
    borderRadius = null,
    gradient = false,
    uppercase = false,
    compact = false,
  } = opts;

  const profile = getOption(STYLES, style, STYLES.flat);
  const palette = getOption(THEMES, theme, THEMES.dark);

  const activeUppercase = profile.uppercase || uppercase;
  const rawLabel = Array.from(String(label || "label")).slice(0, 40).join("");
  const rawValue = Array.from(String(value || "value")).slice(0, 52).join("");

  const validatedIconData = validateIconData(iconData);
  const hasCustomIcon = !!validatedIconData;
  const symbol = hasCustomIcon ? "" : (getBuiltinIcon(icon) || "");
  const fullLabelText = symbol ? `${symbol} ${rawLabel}`.trim() : rawLabel;

  // Colors
  const lbg  = isHex(labelBg)     ? labelBg!.trim()     : palette.labelBg;
  const vbg  = isHex(valueBg)     ? valueBg!.trim()     : palette.valueBg;
  const ltxt = isHex(labelColor)  ? labelColor!.trim()  : palette.labelText;
  const vtxt = isHex(valueColor)  ? valueColor!.trim()  : palette.valueText;
  const bdr  = isHex(borderColor) ? borderColor!.trim() : palette.border;

  // Scaling
  const sizeFactor    = getOption(SIZES, size, 1.0);
  const parsedScale   = Number.parseFloat(String(scale));
  const scaleFactor   = Number.isFinite(parsedScale) ? clamp(parsedScale, 0.7, 2.0) : 1.0;
  const compactFactor = compact ? 0.88 : 1.0;
  const factor        = sizeFactor * scaleFactor * compactFactor;

  // Dimensions
  const basePad    = profile.padX;
  const baseFont   = profile.fontSize;
  const baseHeight = profile.height;
  const baseRadius = borderRadius !== null
    ? clamp(parseInt(String(borderRadius), 10) || 0, 0, 999)
    : profile.radius;

  const height   = Math.max(16, Math.round(baseHeight * factor));
  const padX     = Math.max(5,  Math.round(basePad    * factor));
  const fontSize = Math.max(9,  Math.round(baseFont   * factor));
  const radius   = Math.min(Math.round(baseRadius * factor), Math.floor(height / 2));

  // Icon space
  const iconSize       = hasCustomIcon ? Math.round(height * 0.65) : 0;
  const iconPad        = hasCustomIcon ? Math.round(iconSize * 0.4) : 0;
  const iconTotalSpace = hasCustomIcon ? iconSize + iconPad : 0;

  // Width calculation
  const labelRender = activeUppercase ? fullLabelText.toUpperCase() : fullLabelText;
  const valueRender = activeUppercase ? rawValue.toUpperCase()      : rawValue;

  const leftWidth  = textWidth(labelRender, fontSize) + 2 * padX + iconTotalSpace;
  const rightWidth = textWidth(valueRender, fontSize) + 2 * padX;
  const totalWidth = leftWidth + rightWidth;

  // Outline style
  const isOutline  = style === "outline";
  const leftFill   = isOutline ? "none" : lbg;
  const rightFill  = isOutline ? "none" : vbg;
  const borderAttr = profile.borderWidth > 0
    ? ` stroke="${esc(bdr)}" stroke-width="${profile.borderWidth}"`
    : "";

  // Gradient overlay
  let defs    = "";
  let overlay = "";
  if (gradient) {
    defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.42"/>
<stop offset="0.49" stop-color="#ffffff" stop-opacity="0.10"/>
<stop offset="0.5" stop-color="#000000" stop-opacity="0.10"/>
<stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
</linearGradient></defs>`;
    overlay = `<rect x="0" y="0" width="${totalWidth}" height="${height}" fill="url(#g)" rx="${radius}" ry="${radius}"/>`;
  }

  // Text Y position
  const textY = (height / 2) + (fontSize * 0.33);

  // Icon SVG element
  let iconSvg    = "";
  let labelTextX = leftWidth / 2;

  if (hasCustomIcon) {
    const ix = padX;
    const iy = (height - iconSize) / 2;
    iconSvg    = `<image x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" href="${esc(validatedIconData!)}"/>`;
    labelTextX = iconTotalSpace + padX + textWidth(labelRender, fontSize) / 2;
  }

  // Junction fill
  const junctionX    = Math.max(0, leftWidth - radius);
  const junctionFill = isOutline ? "none" : lbg;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}" role="img" aria-label="${esc(labelRender)}: ${esc(valueRender)}">
<title>${esc(labelRender)}: ${esc(valueRender)}</title>
${defs}
<rect x="0" y="0" width="${leftWidth}" height="${height}" fill="${esc(leftFill)}" rx="${radius}" ry="${radius}"${borderAttr}/>
<rect x="${leftWidth}" y="0" width="${rightWidth}" height="${height}" fill="${esc(rightFill)}" rx="${radius}" ry="${radius}"${borderAttr}/>
<rect x="${junctionX}" y="0" width="${radius}" height="${height}" fill="${esc(junctionFill)}"/>
${iconSvg}
<text x="${labelTextX}" y="${textY.toFixed(1)}" fill="${esc(ltxt)}" font-size="${fontSize}" font-family="${FONT}" font-weight="${profile.fontWeight}" text-anchor="middle">${esc(labelRender)}</text>
<text x="${leftWidth + rightWidth / 2}" y="${textY.toFixed(1)}" fill="${esc(vtxt)}" font-size="${fontSize}" font-family="${FONT}" font-weight="${profile.fontWeight}" text-anchor="middle">${esc(valueRender)}</text>
${overlay}
</svg>`.trim();
}

export function getAvailableStyles(): string[] {
  return Object.keys(STYLES);
}

export function getAvailableThemes(): string[] {
  return Object.keys(THEMES);
}

export function getAvailableIcons(): string[] {
  return Object.keys(ICONS);
}

export function getAvailableSizes(): string[] {
  return Object.keys(SIZES);
}
