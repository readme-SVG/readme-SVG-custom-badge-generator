from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "api"
sys.path.insert(0, str(API_DIR))

from github_stats import generate_custom_badge

SAMPLES = {
    "sample_build.svg": dict(label="build", value="passing", icon="check", theme="terminal", style="flat"),
    "sample_release.svg": dict(label="release", value="v2.0.0", icon="rocket", theme="sunset", style="for-the-badge", uppercase=True),
    "sample_coverage.svg": dict(label="coverage", value="98%", icon="bolt", theme="dark", style="plastic", gradient=True),
    "sample_docs.svg": dict(label="docs", value="stable", icon="docs", theme="light", style="social"),
}


def main():
    output_dir = ROOT / "sample_*.svg"
    output_dir.mkdir(exist_ok=True)
    for file_name, params in SAMPLES.items():
        svg = generate_custom_badge(**params)
        (output_dir / file_name).write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    main()
