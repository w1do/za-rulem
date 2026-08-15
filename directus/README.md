# Directus: схемы коллекций для импорта

В каталоге лежат готовые JSON-описания коллекций, чтобы не создавать поля вручную.

| Файл | Что делает |
|---|---|
| `collections/road_segments.collection.json` | Полная коллекция участков трасс (метаданные, `center`, `bounds_*`, `geometry`, `stations`, SEO, `content`) |
| `collections/stations.collection.json` | Единый реестр АЗС проекта (2GIS ID, координаты, бренды, цены, статусы) |
| `collections/gas_price_road_daily.collection.json` | Полная коллекция снимков цен по участкам |
| `collections/gas_price_daily.fields.json` | Только дополнительные поля к существующей коллекции цен по городам: `area_type`, `area_slug`, `area_parent_slug` |

## Применение одной командой

Если в корне проекта есть `.env` с ключами `DIRECTUS_URL` и `DIRECTUS_ADMIN_TOKEN` (или `DIRECTUS_GAS_PRICES_TOKEN`), достаточно просто:

```bash
npm run directus:schema
```

Или с ручным указанием переменных:

```bash
DIRECTUS_URL=https://api.za-rulem.org \
DIRECTUS_ADMIN_TOKEN=<admin-static-token> \
npm run directus:schema
```

Сначала можно посмотреть план без изменений:

```bash
DIRECTUS_URL=... DIRECTUS_ADMIN_TOKEN=... npm run directus:schema -- --dry-run
```

Скрипт идемпотентен:

- коллекции нет → создаётся вместе со всеми полями;
- коллекция есть → добавляются только отсутствующие поля, существующие не трогаются;
- ничего не удаляет и не переписывает данные.

## Заливка участков трасс

```bash
DIRECTUS_URL=... DIRECTUS_ADMIN_TOKEN=... \
npm run directus:schema -- --items=directus_road_segments.json
```

Записи отправляются батчами по 50 в `road_segments`. Повторный запуск создаст дубликаты, поэтому импорт делайте один раз (или сначала очистите коллекцию).

## Ручной вариант через UI

Directus не импортирует схему через интерфейс, но каждый файл — это готовое тело запроса:

- `*.collection.json` → `POST /collections`;
- каждый элемент `fields[]` из `*.fields.json` → `POST /fields/gas_price_daily`.

## После импорта

1. Выдайте роли, из-под которой работает `DIRECTUS_GAS_PRICES_TOKEN`, права `read` на `road_segments`, `stations` и `gas_price_road_daily` — иначе сборка Astro получит 403 и страницы участков не сгенерируются.
2. Проверьте выдачу: `GET /items/road_segments?limit=1&fields=slug,name,route_code`.
3. Проверьте станции: `GET /items/stations?limit=1`.
