# README SVG Stats Cards Generator

> Dynamic, themeable SVG GitHub stat cards that you can ship straight into any README without babysitting front-end frameworks.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)
![Coverage](https://img.shields.io/badge/Coverage-N%2FA-lightgrey?style=for-the-badge)
![Status](https://img.shields.io/badge/Build-Serverless%20Ready-success?style=for-the-badge)

> [!IMPORTANT]
> This project generates SVG payloads server-side via Flask endpoints and is intended for embedding into GitHub profile README files or repository documentation.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Technical Block](#technical-block)
  - [Project Structure](#project-structure)
  - [Key Design Decisions](#key-design-decisions)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Usage](#usage)
  - [Endpoints](#endpoints)
  - [Example Requests](#example-requests)
- [Configuration](#configuration)
- [Community and Support](#community-and-support)
- [License](#license)
- [Contacts](#contacts)

## Features

This repo is intentionally lean, but it still packs a lot of practical functionality for README automation workflows:

- Generates **4 SVG card types**:
  - `/stats` for high-level profile metrics
  - `/streak` for contribution streak visuals
  - `/graph` for contribution heatmap-like grid
  - `/views` for profile views counter card
- Supports **theme system** with built-in presets exposed from a shared theme map.
- Accepts **runtime query params** to override title, colors, border radius, and selected behavioral flags.
- Ships with **animation toggles** (`animate=true|false`) across card generators.
- Includes deterministic fallback data based on username hash when live GitHub token-backed reads are not available.
- Pulls live GitHub stars plus recent public activity (commits/PRs/issues) and caches it for 24h to reduce API pressure.
- Returns production-friendly SVG responses with cache headers and CORS enabled for embedding.
- Includes a simple interactive HTML playground (`/`) for quick parameter testing.
- Exposes `/themes` JSON endpoint so integrators can introspect available theme keys programmatically.
- Includes a daily GitHub Actions workflow that refreshes sample SVG files automatically.

> [!TIP]
> If you need reproducible screenshots or deterministic preview snapshots, pass explicit numeric params (for example `stars`, `commits`, `count`) instead of relying on runtime data.

## Technology Stack

- **Language:** Python 3.10+
- **Backend runtime:** Flask 3.x
- **GitHub data integration:** PyGithub 2.x (optional, token-based)
- **HTTP client utilities:** `requests`
- **Environment loading utilities:** `python-dotenv`
- **Deployment target:** Vercel Serverless Functions (`@vercel/python`)
- **Output format:** Plain SVG (`image/svg+xml`)

## Technical Block

### Project Structure

```text
readme-SVG-Stats-Cards-generator/
├── api/
│   ├── github_stats.py      # SVG renderers, themes, color utils, rank logic
│   └── stats_index.py       # Flask app, routes, params parsing, response headers
├── stats_index.html         # Local/hosted playground UI for endpoint testing
├── sample_*.svg/
│   ├── sample_stats.svg
│   ├── sample_streak.svg
│   ├── sample_graph.svg
│   └── sample_views.svg
├── requirements.txt         # Python dependencies
├── vercel.json              # Vercel routes and Python function build config
├── process_event.py         # GitHub automation helper script (issue generation pipeline)
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE
└── README.md
```

### Key Design Decisions

- **Single entrypoint Flask app** (`api/stats_index.py`) keeps routing and parameter coercion centralized.
- **Renderer isolation** in `api/github_stats.py` keeps endpoint glue code separated from SVG string generation.
- **Safe coercion helpers** (`_param_int`, `_param_bool`, `_param_float`) reduce malformed query-risk and keep defaults stable.
- **Hash-seeded fallback stats** provide deterministic output even with no GitHub API token.
- **Serverless-first architecture** via `vercel.json` avoids persistent infra overhead.
- **In-memory view counter** is intentionally lightweight and ephemeral; production-grade persistent counters should be moved to Redis/KV.

> [!WARNING]
> The `/views` counter is in-memory and resets on cold start or redeploy. Do not treat it as a durable analytics source in production.

## Getting Started

### Prerequisites

Install these on your workstation first:

- Python `3.10+`
- `pip`
- Optional: virtualenv (`python -m venv .venv`)
- Optional for local serverless parity: Vercel CLI (`npm i -g vercel`)

### Installation

```bash
# 1) Clone your fork or this repository
git clone https://github.com/<your-user>/readme-SVG-Stats-Cards-generator.git
cd readme-SVG-Stats-Cards-generator

# 2) Create and activate a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# .venv\Scripts\activate          # Windows PowerShell

# 3) Install dependencies
pip install -r requirements.txt

# 4) Optional: export GitHub token for real user data
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxx
```

> [!NOTE]
> Without `GITHUB_TOKEN`, the API still works and returns deterministic demo-like values computed from username hashes.

## Testing

This repository currently has no formal test suite checked in, so validation is mostly smoke-test style.

Recommended local checks:

```bash
# Syntax validation
python -m compileall api process_event.py

# Run Flask app directly (if you prefer direct Python execution)
python api/stats_index.py

# Optional serverless parity mode
vercel dev

# Endpoint smoke tests
curl -I "http://127.0.0.1:5000/stats?username=octocat"
curl -I "http://127.0.0.1:5000/streak?username=octocat"
curl -I "http://127.0.0.1:5000/graph?username=octocat"
curl -I "http://127.0.0.1:5000/views?username=octocat"
```

If you add behavior that changes SVG layout, validate both visual rendering and XML validity.

## Deployment

### Vercel (Primary)

This repo is already wired for Vercel deployment via `vercel.json`.

```bash
# Authenticate once
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod
```

Routing is configured so:

- `/` -> HTML playground
- `/stats`, `/streak`, `/graph`, `/views`, `/themes` -> Flask serverless function

### Daily auto-refresh for README assets

Repository includes `.github/workflows/daily-stats-refresh.yml` which rebuilds `sample_*.svg/*.svg` once per day and pushes updates automatically.

To customize behavior, set environment variables in the workflow step:

- `SVG_STATS_USERNAME` (default: repository owner)
- `SVG_STATS_THEME` (default: `dark`)

### Self-hosting (Flask process)

If you prefer container/VPS style deployment, run `api/stats_index.py` behind a reverse proxy and cache SVG responses aggressively.

> [!CAUTION]
> If you expose this publicly at scale, add rate-limiting and caching at CDN/proxy level to avoid abuse or accidental traffic spikes.

## Usage

### Endpoints

- `GET /stats`
- `GET /streak`
- `GET /graph`
- `GET /views`
- `GET /themes`

### Example Requests

```bash
# Profile stats card
curl "https://your-domain.vercel.app/stats?username=octocat&theme=radical&custom_title=Core%20Metrics&hide_rank=false"

# Streak card with custom accent and border radius
curl "https://your-domain.vercel.app/streak?username=octocat&theme=tokyonight&accent_color=ffcc00&border_radius=16"

# Contribution graph limited to 26 weeks
curl "https://your-domain.vercel.app/graph?username=octocat&theme=dark&weeks=26&animate=true"

# Views counter card with style and custom label
curl "https://your-domain.vercel.app/views?username=octocat&label=Profile%20Hits&style=flat&icon=true"

# List supported themes
curl "https://your-domain.vercel.app/themes"
```

Embedding in README markdown:

```md
![GitHub Stats](https://your-domain.vercel.app/stats?username=octocat&theme=dark)
![GitHub Streak](https://your-domain.vercel.app/streak?username=octocat&theme=radical)
![Contribution Graph](https://your-domain.vercel.app/graph?username=octocat&theme=tokyonight)
![Profile Views](https://your-domain.vercel.app/views?username=octocat&label=Profile%20Views)
```

## Configuration

### Environment variables

Core runtime variables:

- `GITHUB_TOKEN` (optional): enables best-effort live GitHub data fetch in `/stats`.

Automation script variables (`process_event.py`):

- `GH_TOKEN`
- `GITHUB_REPOSITORY`
- `EVENT_NAME`
- `TRIGGER_LABELS`
- `PR_NUMBER` (for PR workflows)
- `COMMIT_SHA` (for push workflows)
- `MODEL_TOKEN` (for model endpoint auth)
- `MODEL_NAME` (optional model selection override)

### Query-level config knobs

The API supports per-request configuration through URL params:

- Generic visual params: `theme`, `bg_color`, `title_color`, `text_color`, `border_color`, `border_radius`, `animate`
- `/stats` extras: `custom_title`, `hide_border`, `hide_rank`, `stars`, `commits`, `prs`, `issues`, `contribs`
- `/streak` extras: `current_streak`, `longest_streak`, `total_contribs`, date range fields, `accent_color`
- `/graph` extras: `weeks`
- `/views` extras: `count`, `label`, `style`, `label_color`, `count_color`, `icon`

> [!TIP]
> Color params are accepted without `#` (for example `ffcc00`) and normalized internally.

## Community and Support

If you run into bugs, please open an Issue with reproducible input and expected output.

For contribution workflow and coding standards, check [`CONTRIBUTING.md`](CONTRIBUTING.md).

For community rules, check [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## License

This project is licensed under **GPL-3.0**. See [`LICENSE`](LICENSE) for legal details.

## Contacts

## ❤️ Support the Project

If you find this tool useful, consider leaving a ⭐ on GitHub or supporting the author directly:

[![Patreon](https://img.shields.io/badge/Patreon-OstinFCT-f96854?style=flat-square&logo=patreon)](https://www.patreon.com/OstinFCT)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-fctostin-29abe0?style=flat-square&logo=ko-fi)](https://ko-fi.com/fctostin)
[![Boosty](https://img.shields.io/badge/Boosty-Support-f15f2c?style=flat-square)](https://boosty.to/ostinfct)
[![YouTube](https://img.shields.io/badge/YouTube-FCT--Ostin-red?style=flat-square&logo=youtube)](https://www.youtube.com/@FCT-Ostin)
[![Telegram](https://img.shields.io/badge/Telegram-FCTostin-2ca5e0?style=flat-square&logo=telegram)](https://t.me/FCTostin)
