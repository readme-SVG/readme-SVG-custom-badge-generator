import os
import sys
import json
import hashlib
import time
import math

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, Response, request

from github_stats import (
    generate_stats_card,
    generate_streak_card,
    generate_graph_card,
    generate_views_card,
    THEMES,
)

# Optional: if PyGithub + token present, fetch real data
try:
    from github import Github, Auth

    _gh_token = os.environ.get("GITHUB_TOKEN")
    _gh = Github(auth=Auth.Token(_gh_token)) if _gh_token else None
except Exception:
    _gh = None

app = Flask(__name__)


# ── helpers ──────────────────────────────────────────────────────

def _param(key: str, default: str = "") -> str:
    return request.args.get(key, default).strip()


def _param_int(key: str, default: int = 0, lo: int = 0, hi: int = 999999) -> int:
    try:
        return min(max(int(request.args.get(key, default)), lo), hi)
    except (ValueError, TypeError):
        return default


def _param_float(key: str, default: float = 0.0, lo: float = 0.0, hi: float = 100.0) -> float:
    try:
        return min(max(float(request.args.get(key, default)), lo), hi)
    except (ValueError, TypeError):
        return default


def _param_bool(key: str, default: bool = False) -> bool:
    v = request.args.get(key, "").lower()
    if v in ("true", "1", "yes"):
        return True
    if v in ("false", "0", "no"):
        return False
    return default


def _svg_response(svg: str) -> Response:
    return Response(
        svg,
        mimetype="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=1800, s-maxage=1800",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── Fetch real GitHub data if token is available ─────────────────

def _fetch_user_stats(username: str) -> dict:
    """Try to fetch real stats; fall back to deterministic demo data."""
    if _gh:
        try:
            user = _gh.get_user(username)
            repos = list(user.get_repos(type="owner"))
            stars = sum(r.stargazers_count for r in repos)
            # These are approximations — real values need GraphQL
            return {
                "stars": stars,
                "commits": user.public_repos * 15,  # rough estimate
                "prs": user.public_repos * 3,
                "issues": user.public_repos * 2,
                "contribs": user.contributions if hasattr(user, "contributions") else user.public_repos * 8,
                "followers": user.followers,
            }
        except Exception:
            pass

    # Deterministic demo data from username hash
    seed = int(hashlib.md5(username.encode()).hexdigest()[:8], 16)
    return {
        "stars": 50 + seed % 500,
        "commits": 200 + (seed >> 4) % 2000,
        "prs": 20 + (seed >> 8) % 200,
        "issues": 10 + (seed >> 12) % 100,
        "contribs": 30 + (seed >> 16) % 80,
        "followers": 10 + seed % 300,
    }


def _fetch_streak_data(username: str) -> dict:
    """Streak data — would need contribution calendar from GraphQL in production."""
    seed = int(hashlib.md5(username.encode()).hexdigest()[:8], 16)
    current = 1 + (seed % 60)
    longest = current + (seed >> 4) % 100
    total = 200 + (seed >> 8) % 3000
    return {
        "current_streak": current,
        "longest_streak": longest,
        "total_contribs": total,
        "streak_start": "2025-08-01",
        "streak_end": "2025-09-29",
        "longest_start": "2024-11-01",
        "longest_end": "2025-02-15",
    }


# Simple in-memory view counter (resets on cold start — use Redis/KV in prod)
_view_counts: dict[str, int] = {}


# ── HTML playground ──────────────────────────────────────────────

@app.route("/")
def index():
    html_path = os.path.join(os.path.dirname(__file__), "..", "stats_index.html")
    try:
        with open(os.path.abspath(html_path), "r", encoding="utf-8") as f:
            return Response(f.read(), mimetype="text/html")
    except FileNotFoundError:
        return Response("<h1>GitHub Stats Cards API</h1><p>Use /stats, /streak, /graph, /views endpoints</p>", mimetype="text/html")


# ── Card endpoints ───────────────────────────────────────────────

@app.route("/stats")
def stats_card():
    username = _param("username", "octocat")
    theme = _param("theme", "dark")
    data = _fetch_user_stats(username)

    svg = generate_stats_card(
        username=username,
        stars=_param_int("stars", data["stars"]),
        commits=_param_int("commits", data["commits"]),
        prs=_param_int("prs", data["prs"]),
        issues=_param_int("issues", data["issues"]),
        contribs=_param_int("contribs", data["contribs"]),
        theme=theme,
        custom_title=_param("custom_title") or None,
        hide_border=_param_bool("hide_border"),
        hide_rank=_param_bool("hide_rank"),
        border_radius=_param_int("border_radius", 10, 0, 30),
        bg_color=_param("bg_color") or None,
        title_color=_param("title_color") or None,
        text_color=_param("text_color") or None,
        icon_color=_param("icon_color") or None,
        border_color=_param("border_color") or None,
        animate=_param_bool("animate", True),
    )
    return _svg_response(svg)


@app.route("/streak")
def streak_card():
    username = _param("username", "octocat")
    theme = _param("theme", "dark")
    data = _fetch_streak_data(username)

    svg = generate_streak_card(
        username=username,
        current_streak=_param_int("current_streak", data["current_streak"]),
        longest_streak=_param_int("longest_streak", data["longest_streak"]),
        total_contribs=_param_int("total_contribs", data["total_contribs"]),
        streak_start=_param("streak_start", data["streak_start"]),
        streak_end=_param("streak_end", data["streak_end"]),
        longest_start=_param("longest_start", data["longest_start"]),
        longest_end=_param("longest_end", data["longest_end"]),
        theme=theme,
        hide_border=_param_bool("hide_border"),
        border_radius=_param_int("border_radius", 10, 0, 30),
        bg_color=_param("bg_color") or None,
        title_color=_param("title_color") or None,
        text_color=_param("text_color") or None,
        accent_color=_param("accent_color") or None,
        border_color=_param("border_color") or None,
        animate=_param_bool("animate", True),
    )
    return _svg_response(svg)


@app.route("/graph")
def graph_card():
    username = _param("username", "octocat")
    theme = _param("theme", "dark")

    svg = generate_graph_card(
        username=username,
        theme=theme,
        hide_border=_param_bool("hide_border"),
        border_radius=_param_int("border_radius", 10, 0, 30),
        bg_color=_param("bg_color") or None,
        title_color=_param("title_color") or None,
        text_color=_param("text_color") or None,
        border_color=_param("border_color") or None,
        weeks=_param_int("weeks", 52, 10, 52),
        animate=_param_bool("animate", True),
    )
    return _svg_response(svg)


@app.route("/views")
def views_card():
    username = _param("username", "octocat")
    theme = _param("theme", "dark")

    # Increment view count
    _view_counts[username] = _view_counts.get(username, 0) + 1
    count = _param_int("count", _view_counts[username])

    svg = generate_views_card(
        username=username,
        count=count,
        theme=theme,
        label=_param("label", "Profile Views"),
        style=_param("style", "flat"),
        bg_color=_param("bg_color") or None,
        label_color=_param("label_color") or None,
        count_color=_param("count_color") or None,
        icon_show=_param_bool("icon", True),
    )
    return _svg_response(svg)


@app.route("/themes")
def list_themes():
    return Response(
        json.dumps({"themes": list(THEMES.keys())}),
        mimetype="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )
