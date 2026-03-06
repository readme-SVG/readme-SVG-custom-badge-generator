from __future__ import annotations

import html
import re
from dataclasses import dataclass

FONT = "Verdana,DejaVu Sans,sans-serif"


COLOR_THEMES = {
    "dark": {
        "label_bg": "#1f2937",
        "label_text": "#f3f4f6",
        "value_bg": "#111827",
        "value_text": "#93c5fd",
        "border": "#374151",
    },
    "light": {
        "label_bg": "#f3f4f6",
        "label_text": "#111827",
        "value_bg": "#ffffff",
        "value_text": "#1d4ed8",
        "border": "#d1d5db",
    },
    "neon": {
        "label_bg": "#151026",
        "label_text": "#67e8f9",
        "value_bg": "#1e1237",
        "value_text": "#c4b5fd",
        "border": "#7c3aed",
    },
    "sunset": {
        "label_bg": "#7c2d12",
        "label_text": "#ffedd5",
        "value_bg": "#9a3412",
        "value_text": "#fde68a",
        "border": "#fdba74",
    },
    "terminal": {
        "label_bg": "#052e16",
        "label_text": "#dcfce7",
        "value_bg": "#14532d",
        "value_text": "#86efac",
        "border": "#22c55e",
    },
}

ICON_SET = {
    "star": "★",
    "heart": "❤",
    "check": "✓",
    "fire": "🔥",
    "bolt": "⚡",
    "rocket": "🚀",
    "code": "⌘",
    "build": "⚙",
    "docs": "📘",
    "none": "",
}


@dataclass
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
}

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def _esc(value: str) -> str:
    return html.escape(value, quote=True)


def _safe_color(candidate: str | None, fallback: str) -> str:
    if not candidate:
        return fallback
    if HEX_RE.match(candidate.strip()):
        return candidate.strip()
    return fallback


def _safe_int(value: int, lo: int, hi: int, fallback: int) -> int:
    try:
        return min(max(int(value), lo), hi)
    except (TypeError, ValueError):
        return fallback


def _text_width(value: str, font_size: int, uppercase: bool) -> int:
    text = value.upper() if uppercase else value
    multiplier = 0.62 if font_size >= 12 else 0.58
    return int(max(1, len(text)) * font_size * multiplier)


def _resolve_theme(theme: str):
    return COLOR_THEMES.get(theme, COLOR_THEMES["dark"])


def _gradient_overlay(style: str, enabled: bool, value_x: int, value_width: int, height: int) -> str:
    if style != "plastic" or not enabled:
        return ""
    return (
        f'<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="#ffffff" stop-opacity="0.42" />'
        f'<stop offset="0.49" stop-color="#ffffff" stop-opacity="0.10" />'
        f'<stop offset="0.5" stop-color="#000000" stop-opacity="0.1" />'
        f'<stop offset="1" stop-color="#000000" stop-opacity="0.18" />'
        f"</linearGradient>"
        f'<rect x="0" y="0" width="{value_x + value_width}" height="{height}" fill="url(#g)" rx="4" />'
    )


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
    border_radius: int = 4,
    gradient: bool = False,
    uppercase: bool = False,
    compact: bool = False,
):
    profile = STYLE_MAP.get(style, STYLE_MAP["flat"])
    palette = _resolve_theme(theme)

    active_uppercase = profile.uppercase or uppercase
    label_text = (label or "label")[:40]
    value_text = (value or "value")[:52]

    symbol = ICON_SET.get(icon, "")
    label_prefix = f"{symbol} " if symbol else ""
    full_label_text = f"{label_prefix}{label_text}".strip()

    bg_left = _safe_color(label_bg, palette["label_bg"])
    bg_right = _safe_color(value_bg, palette["value_bg"])
    fg_left = _safe_color(label_color, palette["label_text"])
    fg_right = _safe_color(value_color, palette["value_text"])
    stroke = _safe_color(border_color, palette["border"])

    height = profile.height if not compact else max(18, profile.height - 4)
    pad_x = profile.pad_x if not compact else max(6, profile.pad_x - 2)
    font_size = profile.font_size if not compact else max(10, profile.font_size - 1)
    radius = _safe_int(border_radius, 0, 18, profile.radius)

    left_width = _text_width(full_label_text, font_size, active_uppercase) + 2 * pad_x
    right_width = _text_width(value_text, font_size, active_uppercase) + 2 * pad_x
    total_width = left_width + right_width

    label_render = full_label_text.upper() if active_uppercase else full_label_text
    value_render = value_text.upper() if active_uppercase else value_text

    border_attr = f' stroke="{_esc(stroke)}" stroke-width="{profile.border_width}"' if profile.border_width else ""

    defs = ""
    plastic_overlay = _gradient_overlay(style, gradient, left_width, right_width, height)
    if plastic_overlay:
        defs = "<defs>"
        defs += '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        defs += '<stop offset="0" stop-color="#ffffff" stop-opacity="0.42" />'
        defs += '<stop offset="0.49" stop-color="#ffffff" stop-opacity="0.10" />'
        defs += '<stop offset="0.5" stop-color="#000000" stop-opacity="0.1" />'
        defs += '<stop offset="1" stop-color="#000000" stop-opacity="0.18" />'
        defs += "</linearGradient></defs>"

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="{height}" role="img" aria-label="{_esc(label_render)}: {_esc(value_render)}">
{defs}
<rect x="0" y="0" width="{left_width}" height="{height}" fill="{_esc(bg_left)}" rx="{radius}" ry="{radius}"{border_attr} />
<rect x="{left_width}" y="0" width="{right_width}" height="{height}" fill="{_esc(bg_right)}" rx="{radius}" ry="{radius}"{border_attr} />
<rect x="{left_width - radius}" y="0" width="{radius}" height="{height}" fill="{_esc(bg_left)}" />
<text x="{left_width / 2}" y="{(height / 2) + (font_size * 0.33)}" fill="{_esc(fg_left)}" font-size="{font_size}" font-family="{FONT}" font-weight="{profile.font_weight}" text-anchor="middle">{_esc(label_render)}</text>
<text x="{left_width + (right_width / 2)}" y="{(height / 2) + (font_size * 0.33)}" fill="{_esc(fg_right)}" font-size="{font_size}" font-family="{FONT}" font-weight="{profile.font_weight}" text-anchor="middle">{_esc(value_render)}</text>
{f'<rect x="0" y="0" width="{total_width}" height="{height}" fill="url(#g)" rx="{radius}" ry="{radius}" />' if plastic_overlay else ''}
</svg>'''
    return svg
