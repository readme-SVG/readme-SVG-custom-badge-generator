from __future__ import annotations

import html
import math
import re
from dataclasses import dataclass

FONT = "Verdana,DejaVu Sans,sans-serif"


COLOR_THEMES = {
    "dark": {"label_bg": "#1f2937", "label_text": "#f3f4f6", "value_bg": "#111827", "value_text": "#93c5fd", "border": "#374151"},
    "light": {"label_bg": "#f3f4f6", "label_text": "#111827", "value_bg": "#ffffff", "value_text": "#1d4ed8", "border": "#d1d5db"},
    "neon": {"label_bg": "#151026", "label_text": "#67e8f9", "value_bg": "#1e1237", "value_text": "#c4b5fd", "border": "#7c3aed"},
    "sunset": {"label_bg": "#7c2d12", "label_text": "#ffedd5", "value_bg": "#9a3412", "value_text": "#fde68a", "border": "#fdba74"},
    "terminal": {"label_bg": "#052e16", "label_text": "#dcfce7", "value_bg": "#14532d", "value_text": "#86efac", "border": "#22c55e"},
}

COLOR_PALETTE = [
    "#111827", "#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af",
    "#ffffff", "#f3f4f6", "#1d4ed8", "#2563eb", "#0ea5e9", "#06b6d4",
    "#7c3aed", "#a855f7", "#db2777", "#ef4444", "#f97316", "#f59e0b",
    "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#8b5cf6", "#ec4899",
]

ICON_SET = {
    "star": "★", "heart": "❤", "check": "✓", "fire": "🔥", "bolt": "⚡",
    "rocket": "🚀", "code": "⌘", "build": "⚙", "docs": "📘", "none": "",
}


@dataclass(frozen=True, slots=True)
class BadgeStyle:
    name: str
    radius: int
    font_size: int
    font_weight: str
    pad_x: int
    height: int
    uppercase: bool
    border_width: int


STYLE_MAP = {
    "flat": BadgeStyle("flat", 4, 11, "600", 10, 24, False, 0),
    "flat-square": BadgeStyle("flat-square", 0, 11, "600", 10, 24, False, 0),
    "for-the-badge": BadgeStyle("for-the-badge", 4, 12, "700", 12, 28, True, 0),
    "plastic": BadgeStyle("plastic", 4, 11, "700", 10, 24, False, 1),
    "social": BadgeStyle("social", 3, 11, "600", 10, 24, False, 1),
    "rounded": BadgeStyle("rounded", 12, 11, "600", 11, 24, False, 0),
    "pill": BadgeStyle("pill", 999, 11, "700", 12, 24, False, 0),
    "outline": BadgeStyle("outline", 6, 11, "600", 10, 24, False, 1),
    "soft": BadgeStyle("soft", 8, 11, "600", 11, 24, False, 0),
}

SIZE_MAP = {
    "xs": 0.82,
    "sm": 0.92,
    "md": 1.0,
    "lg": 1.16,
    "xl": 1.32,
}

HEX_RE = re.compile(r"#[0-9a-fA-F]{6}")
INVALID_XML_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]")


def _esc(value: str) -> str:
    return html.escape(INVALID_XML_RE.sub("\ufffd", value), quote=True)


def _safe_color(candidate: str | None, fallback: str) -> str:
    if not isinstance(candidate, str):
        return fallback
    candidate = candidate.strip()
    return candidate if HEX_RE.fullmatch(candidate) else fallback


def _safe_int(value: int, lo: int, hi: int, fallback: int) -> int:
    try:
        return min(max(int(value), lo), hi)
    except (TypeError, ValueError, OverflowError):
        return fallback


def _safe_float(value: float, lo: float, hi: float, fallback: float) -> float:
    try:
        parsed = float(value)
        return min(max(parsed, lo), hi) if math.isfinite(parsed) else fallback
    except (TypeError, ValueError, OverflowError):
        return fallback


def _resolve_theme(theme: str):
    return COLOR_THEMES.get(theme, COLOR_THEMES["dark"])


def _text_width(value: str, font_size: int, uppercase: bool) -> int:
    text = value.upper() if uppercase else value
    multiplier = 0.62 if font_size >= 12 else 0.58
    return int(max(1, len(text)) * font_size * multiplier)


def _style_border(style_name: str, border_width: int, border_color: str) -> tuple[str | None, str]:
    if border_width <= 0:
        return None, ""
    fill = "none" if style_name == "outline" else None
    return fill, f' stroke="{_esc(border_color)}" stroke-width="{border_width}"'


_DATA_URI_RE = re.compile(
    r"data:image/(?:png|jpeg|gif|svg\+xml|webp);base64,"
    r"(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?"
)

MAX_ICON_DATA_LEN = 200_000  # Approximately 150 KB of decoded image data.


def _validate_icon_data(data_uri: str | None) -> str | None:
    """Accept bounded, canonical base64 image data URIs."""
    if not isinstance(data_uri, str) or data_uri.endswith(",") or len(data_uri) > MAX_ICON_DATA_LEN:
        return None
    return data_uri if _DATA_URI_RE.fullmatch(data_uri) else None


def generate_custom_badge(
    label: str = "build",
    value: str = "passing",
    icon: str = "check",
    style: str = "flat",
    theme: str = "dark",
    label_bg: str | None = None,
    value_bg: str | None = None,
    label_color: str | None = None,
    value_color: str | None = None,
    border_color: str | None = None,
    border_radius: int | None = None,
    gradient: bool = False,
    uppercase: bool = False,
    compact: bool = False,
    size: str = "md",
    scale: float = 1.0,
    icon_data: str | None = None,
):
    profile = STYLE_MAP.get(style, STYLE_MAP["flat"])
    palette = _resolve_theme(theme)

    active_uppercase = profile.uppercase or uppercase
    label_text = (label or "label")[:40]
    value_text = (value or "value")[:52]

    # Custom uploaded icon takes precedence over built-in icon set.
    validated_icon_data = _validate_icon_data(icon_data)
    if validated_icon_data:
        symbol = ""
    else:
        symbol = ICON_SET.get(icon, "")
    full_label_text = f"{symbol} {label_text}".strip() if symbol else label_text

    bg_left = _safe_color(label_bg, palette["label_bg"])
    bg_right = _safe_color(value_bg, palette["value_bg"])
    fg_left = _safe_color(label_color, palette["label_text"])
    fg_right = _safe_color(value_color, palette["value_text"])
    stroke = _safe_color(border_color, palette["border"])

    size_factor = SIZE_MAP.get(size, SIZE_MAP["md"])
    scale_factor = _safe_float(scale, 0.7, 2.0, 1.0)
    factor = size_factor * scale_factor
    compact_factor = 0.88 if compact else 1.0
    factor *= compact_factor

    base_height = profile.height
    base_pad = profile.pad_x
    base_font = profile.font_size
    base_radius = _safe_int(border_radius, 0, 999, profile.radius)

    height = max(16, int(round(base_height * factor)))
    pad_x = max(5, int(round(base_pad * factor)))
    font_size = max(9, int(round(base_font * factor)))
    radius = min(int(round(base_radius * factor)), max(0, int(height / 2)))

    # When a custom icon image is present, reserve space for it in the left section.
    icon_img_size = int(height * 0.7) if validated_icon_data else 0
    icon_gap = 4 if validated_icon_data else 0

    left_width = _text_width(full_label_text, font_size, active_uppercase) + 2 * pad_x + icon_img_size + icon_gap
    right_width = _text_width(value_text, font_size, active_uppercase) + 2 * pad_x
    total_width = left_width + right_width

    label_render = full_label_text.upper() if active_uppercase else full_label_text
    value_render = value_text.upper() if active_uppercase else value_text

    fill_override, border_attr = _style_border(profile.name, profile.border_width, stroke)
    left_fill = fill_override if fill_override is not None else bg_left
    right_fill = fill_override if fill_override is not None else bg_right

    defs = ""
    overlay = ""
    if style == "plastic" and gradient:
        defs = """<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.42" />
<stop offset="0.49" stop-color="#ffffff" stop-opacity="0.10" />
<stop offset="0.5" stop-color="#000000" stop-opacity="0.1" />
<stop offset="1" stop-color="#000000" stop-opacity="0.18" />
</linearGradient></defs>"""
        overlay = f'<rect x="0" y="0" width="{total_width}" height="{height}" fill="url(#g)" rx="{radius}" ry="{radius}" />'

    # Build optional <image> element for custom uploaded icon.
    icon_element = ""
    if validated_icon_data:
        icon_x = pad_x
        icon_y = int((height - icon_img_size) / 2)
        icon_element = (
            f'<image x="{icon_x}" y="{icon_y}" width="{icon_img_size}" height="{icon_img_size}"'
            f' href="{validated_icon_data}" />'
        )
        # Shift the label text right to make room for the icon.
        label_text_x = pad_x + icon_img_size + icon_gap + _text_width(full_label_text, font_size, active_uppercase) / 2
    else:
        label_text_x = left_width / 2

    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{total_width}" height="{height}" role="img" aria-label="{_esc(label_render)}: {_esc(value_render)}">
{defs}
<rect x="0" y="0" width="{left_width}" height="{height}" fill="{_esc(left_fill)}" rx="{radius}" ry="{radius}"{border_attr} />
<rect x="{left_width}" y="0" width="{right_width}" height="{height}" fill="{_esc(right_fill)}" rx="{radius}" ry="{radius}"{border_attr} />
<rect x="{max(0, left_width - radius)}" y="0" width="{radius}" height="{height}" fill="{_esc(left_fill)}" />
{icon_element}
<text x="{label_text_x}" y="{(height / 2) + (font_size * 0.33)}" fill="{_esc(fg_left)}" font-size="{font_size}" font-family="{FONT}" font-weight="{profile.font_weight}" text-anchor="middle">{_esc(label_render)}</text>
<text x="{left_width + (right_width / 2)}" y="{(height / 2) + (font_size * 0.33)}" fill="{_esc(fg_right)}" font-size="{font_size}" font-family="{FONT}" font-weight="{profile.font_weight}" text-anchor="middle">{_esc(value_render)}</text>
{overlay}
</svg>'''
