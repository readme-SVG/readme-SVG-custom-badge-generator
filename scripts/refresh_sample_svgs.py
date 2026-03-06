import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "api"
sys.path.insert(0, str(API_DIR))

from data_fetchers import fetch_user_stats
from github_stats import generate_graph_card, generate_stats_card, generate_streak_card, generate_views_card


def main():
    username = os.environ.get("SVG_STATS_USERNAME", "octocat")
    theme = os.environ.get("SVG_STATS_THEME", "dark")

    stats = fetch_user_stats(username, force_refresh=True)
    sample_dir = ROOT / "sample_*.svg"
    sample_dir.mkdir(exist_ok=True)

    (sample_dir / "sample_stats.svg").write_text(
        generate_stats_card(
            username=username,
            stars=stats["stars"],
            commits=stats["commits"],
            prs=stats["prs"],
            issues=stats["issues"],
            contribs=stats["contribs"],
            theme=theme,
            animate=True,
        ),
        encoding="utf-8",
    )

    (sample_dir / "sample_streak.svg").write_text(
        generate_streak_card(username=username, theme=theme, animate=True),
        encoding="utf-8",
    )

    (sample_dir / "sample_graph.svg").write_text(
        generate_graph_card(username=username, theme=theme, weeks=52, animate=True),
        encoding="utf-8",
    )

    (sample_dir / "sample_views.svg").write_text(
        generate_views_card(username=username, count=stats["contribs"], theme=theme, label="Activity", icon_show=True),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
