from __future__ import annotations

import json
import os
import sys

from flask import Flask, Response, request

sys.path.insert(0, os.path.dirname(__file__))

from data_fetchers import get_catalog, resolve_preset
from github_stats import generate_custom_badge

app = Flask(__name__)


def _param(name: str, default: str = "") -> str:
    return request.args.get(name, default).strip()


def _param_bool(name: str, default: bool = False) -> bool:
    value = request.args.get(name, "").strip().lower()
    if value in ("1", "true", "yes", "on"):
        return True
    if value in ("0", "false", "no", "off"):
        return False
    return default


def _param_int(name: str, default: int, lo: int, hi: int) -> int:
    try:
        return min(max(int(request.args.get(name, default)), lo), hi)
    except (TypeError, ValueError):
        return default


def _svg_response(svg: str) -> Response:
    return Response(
        svg,
        mimetype="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.route("/")
def index():
    html_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "stats_index.html"))
    with open(html_path, "r", encoding="utf-8") as file:
        return Response(file.read(), mimetype="text/html")


@app.route("/badge")
def badge():
    preset_name = _param("preset")
    preset = resolve_preset(preset_name)

    svg = generate_custom_badge(
        label=_param("label", preset["label"]),
        value=_param("value", preset["value"]),
        icon=_param("icon", preset["icon"]),
        style=_param("style", preset["style"]),
        theme=_param("theme", preset["theme"]),
        label_bg=_param("label_bg") or None,
        value_bg=_param("value_bg") or None,
        label_color=_param("label_color") or None,
        value_color=_param("value_color") or None,
        border_color=_param("border_color") or None,
        border_radius=_param_int("border_radius", 4, 0, 18),
        gradient=_param_bool("gradient", False),
        uppercase=_param_bool("uppercase", False),
        compact=_param_bool("compact", False),
    )
    return _svg_response(svg)


@app.route("/catalog")
def catalog():
    return Response(json.dumps(get_catalog()), mimetype="application/json", headers={"Access-Control-Allow-Origin": "*"})


@app.route("/health")
def health():
    return Response(json.dumps({"ok": True, "service": "custom-badge-generator"}), mimetype="application/json")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
