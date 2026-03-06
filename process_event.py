from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
API_DIR = ROOT / "api"
sys.path.insert(0, str(API_DIR))

from github_stats import generate_custom_badge


def main():
    parser = argparse.ArgumentParser(description="Generate one custom SVG badge from CLI.")
    parser.add_argument("--label", default="build")
    parser.add_argument("--value", default="passing")
    parser.add_argument("--icon", default="check")
    parser.add_argument("--style", default="flat")
    parser.add_argument("--theme", default="dark")
    parser.add_argument("--output", default="badge.svg")
    parser.add_argument("--uppercase", action="store_true")
    parser.add_argument("--compact", action="store_true")
    parser.add_argument("--gradient", action="store_true")
    args = parser.parse_args()

    svg = generate_custom_badge(
        label=args.label,
        value=args.value,
        icon=args.icon,
        style=args.style,
        theme=args.theme,
        uppercase=args.uppercase,
        compact=args.compact,
        gradient=args.gradient,
    )

    out = Path(args.output)
    out.write_text(svg, encoding="utf-8")
    print(f"Badge saved to {out}")


if __name__ == "__main__":
    main()
