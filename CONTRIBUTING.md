# Contributing

Спасибо за вклад в `README Custom Badge Generator`.

## Development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python api/stats_index.py
```

## What to focus on

- Кастомизация endpoint `/badge`
- Новые стили и темы
- Производительность рендера SVG
- UX playground (`stats_index.html`)

## Pull Request checklist

- Опиши сценарий использования изменения.
- Добавь/обнови sample SVG через `python scripts/refresh_sample_svgs.py`.
- Проверь запуск локально: `python api/stats_index.py`.
- Если менял API, обнови `README.md`.

## Commit style

Используй понятные короткие сообщения:

- `feat: add social compact style tuning`
- `fix: clamp radius in badge renderer`
- `docs: update badge query params`
