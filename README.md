# README Custom Badge Generator

Serverless генератор SVG-баджей для README, профилей GitHub и документации. Проект полностью сфокусирован на одной задаче: делать максимально кастомизируемые баджи через URL-параметры.

## Что умеет

- Генерирует баджи через endpoint `/badge`.
- Поддерживает стили: `flat`, `flat-square`, `for-the-badge`, `plastic`, `social`.
- Поддерживает темы: `dark`, `light`, `neon`, `sunset`, `terminal`.
- Кастомизирует текст, иконку, цвета, радиус, uppercase, compact-режим, plastic-градиент.
- Имеет пресеты и каталог возможностей через `/catalog`.
- Содержит web playground на `/` для live-просмотра и копирования Markdown.

## Быстрый старт

```bash
git clone https://github.com/<your-user>/readme-SVG-Stats-Cards-generator.git
cd readme-SVG-Stats-Cards-generator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python api/stats_index.py
```

Откройте `http://127.0.0.1:5000`.

## API

### `GET /badge`

Основные параметры:

- `label` — левая часть (`build`)
- `value` — правая часть (`passing`)
- `icon` — `star|heart|check|fire|bolt|rocket|code|build|docs|none`
- `style` — `flat|flat-square|for-the-badge|plastic|social`
- `theme` — `dark|light|neon|sunset|terminal`
- `label_bg`, `value_bg`, `label_color`, `value_color`, `border_color` — HEX, например `#111827`
- `border_radius` — `0..18`
- `gradient` — `true|false` (актуально для `plastic`)
- `uppercase` — `true|false`
- `compact` — `true|false`
- `preset` — `build|coverage|release|docs|quality`

Пример:

```text
/badge?preset=release&label=deploy&value=prod&style=for-the-badge&icon=rocket&theme=sunset
```

### `GET /catalog`

Возвращает JSON со всеми темами, стилями, иконками и пресетами.

### `GET /health`

Проверка доступности сервиса.

## Встраивание в README

```md
![build](https://your-domain.vercel.app/badge?label=build&value=passing&icon=check&theme=terminal)
```

```md
![coverage](https://your-domain.vercel.app/badge?label=coverage&value=98%25&style=plastic&gradient=true&theme=dark)
```

## Локальные примеры

Обновить sample SVG:

```bash
python scripts/refresh_sample_svgs.py
```

Файлы будут в `sample_*.svg/`.

## Deploy на Vercel

Проект уже готов к serverless deploy через `vercel.json`.

```bash
vercel
```

## Лицензия

`GPL-3.0`, см. `LICENSE`.
