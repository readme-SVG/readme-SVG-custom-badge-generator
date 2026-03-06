from __future__ import annotations

from github_stats import COLOR_THEMES, ICON_SET, STYLE_MAP


BADGE_PRESETS = {
    "build": {"label": "build", "value": "passing", "icon": "check", "theme": "terminal", "style": "flat"},
    "coverage": {"label": "coverage", "value": "98%", "icon": "bolt", "theme": "dark", "style": "plastic"},
    "release": {"label": "release", "value": "v2.0.0", "icon": "rocket", "theme": "sunset", "style": "for-the-badge"},
    "docs": {"label": "docs", "value": "stable", "icon": "docs", "theme": "light", "style": "social"},
    "quality": {"label": "quality", "value": "A+", "icon": "star", "theme": "neon", "style": "flat-square"},
}


def get_catalog():
    return {
        "themes": sorted(COLOR_THEMES.keys()),
        "styles": sorted(STYLE_MAP.keys()),
        "icons": sorted(ICON_SET.keys()),
        "presets": BADGE_PRESETS,
    }


def resolve_preset(name: str):
    return BADGE_PRESETS.get((name or "").strip().lower(), BADGE_PRESETS["build"])
