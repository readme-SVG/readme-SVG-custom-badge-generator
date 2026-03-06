import os
import sys
import json
import hashlib

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, Response, request
from github_stats import generate_stats_card, generate_streak_card, generate_graph_card, generate_views_card, THEMES
from data_fetchers import fetch_user_stats

app = Flask(__name__)

def _param(key, default=""):
    return request.args.get(key, default).strip()

def _param_int(key, default=0, lo=0, hi=999999):
    try:
        return min(max(int(request.args.get(key, default)), lo), hi)
    except (ValueError, TypeError):
        return default

def _param_bool(key, default=False):
    v = request.args.get(key, "").lower()
    if v in ("true","1","yes"): return True
    if v in ("false","0","no"): return False
    return default

def _svg_response(svg):
    return Response(svg, mimetype="image/svg+xml", headers={"Cache-Control":"public, max-age=86400, s-maxage=86400","Access-Control-Allow-Origin":"*"})

def _fetch_streak_data(username):
    seed = int(hashlib.md5(username.encode()).hexdigest()[:8], 16)
    current = 1+(seed%60)
    longest = current+(seed>>4)%100
    total = 200+(seed>>8)%3000
    return {"current_streak":current,"longest_streak":longest,"total_contribs":total,"streak_start":"2025-08-01","streak_end":"2025-09-29","longest_start":"2024-11-01","longest_end":"2025-02-15"}

_view_counts = {}

@app.route("/")
def index():
    html_path = os.path.join(os.path.dirname(__file__), "..", "stats_index.html")
    try:
        with open(os.path.abspath(html_path), "r", encoding="utf-8") as f:
            return Response(f.read(), mimetype="text/html")
    except FileNotFoundError:
        return Response("<h1>GitHub Stats Cards API</h1><p>Use /stats, /streak, /graph, /views</p>", mimetype="text/html")

@app.route("/stats")
def stats_card():
    username = _param("username","octocat")
    theme = _param("theme","dark")
    data = fetch_user_stats(username)
    svg = generate_stats_card(
        username=username,
        stars=_param_int("stars",data["stars"]),
        commits=_param_int("commits",data["commits"]),
        prs=_param_int("prs",data["prs"]),
        issues=_param_int("issues",data["issues"]),
        contribs=_param_int("contribs",data["contribs"]),
        theme=theme,
        custom_title=_param("custom_title") or None,
        hide_border=_param_bool("hide_border"),
        hide_rank=_param_bool("hide_rank"),
        border_radius=_param_int("border_radius",10,0,30),
        bg_color=_param("bg_color") or None,
        title_color=_param("title_color") or None,
        text_color=_param("text_color") or None,
        icon_color=_param("icon_color") or None,
        border_color=_param("border_color") or None,
        animate=_param_bool("animate",True),
    )
    return _svg_response(svg)

@app.route("/streak")
def streak_card():
    username = _param("username","octocat")
    theme = _param("theme","dark")
    data = _fetch_streak_data(username)
    svg = generate_streak_card(
        username=username,
        current_streak=_param_int("current_streak",data["current_streak"]),
        longest_streak=_param_int("longest_streak",data["longest_streak"]),
        total_contribs=_param_int("total_contribs",data["total_contribs"]),
        streak_start=_param("streak_start",data["streak_start"]),
        streak_end=_param("streak_end",data["streak_end"]),
        longest_start=_param("longest_start",data["longest_start"]),
        longest_end=_param("longest_end",data["longest_end"]),
        theme=theme,
        hide_border=_param_bool("hide_border"),
        border_radius=_param_int("border_radius",10,0,30),
        bg_color=_param("bg_color") or None,
        title_color=_param("title_color") or None,
        text_color=_param("text_color") or None,
        accent_color=_param("accent_color") or None,
        border_color=_param("border_color") or None,
        animate=_param_bool("animate",True),
    )
    return _svg_response(svg)

@app.route("/graph")
def graph_card():
    username = _param("username","octocat")
    theme = _param("theme","dark")
    svg = generate_graph_card(
        username=username,
        theme=theme,
        hide_border=_param_bool("hide_border"),
        border_radius=_param_int("border_radius",10,0,30),
        bg_color=_param("bg_color") or None,
        title_color=_param("title_color") or None,
        text_color=_param("text_color") or None,
        border_color=_param("border_color") or None,
        weeks=_param_int("weeks",52,10,52),
        animate=_param_bool("animate",True),
    )
    return _svg_response(svg)

@app.route("/views")
def views_card():
    username = _param("username","octocat")
    theme = _param("theme","dark")
    _view_counts[username] = _view_counts.get(username,0)+1
    count = _param_int("count",_view_counts[username])
    svg = generate_views_card(
        username=username,
        count=count,
        theme=theme,
        label=_param("label","Profile Views"),
        style=_param("style","flat"),
        bg_color=_param("bg_color") or None,
        label_color=_param("label_color") or None,
        count_color=_param("count_color") or None,
        icon_show=_param_bool("icon",True),
    )
    return _svg_response(svg)

@app.route("/themes")
def list_themes():
    return Response(json.dumps({"themes":list(THEMES.keys())}),mimetype="application/json",headers={"Access-Control-Allow-Origin":"*"})
