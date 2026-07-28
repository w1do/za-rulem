# za-rulem — техпомощь на дороге в Тюмени

**Сайт: [ZA-RULEM](https://za-rulem.org)**

Сайт автопомощи на дорогах Тюмени и области. Помогает быстро найти нужную услугу (прикурить авто, замена аккумулятора, подвоз топлива, отогрев, вытаскивание из грязи лебёдкой и т.д.) и оставить заявку.

Проект построен как лёгкий статический сайт, заточенный под SEO: каждая страница — посадочная под поисковый запрос, услуги организованы в тематические кластеры (pillar → spokes) для полного охвата интента.

## 🚀 Технологический стек

- **Framework**: [Astro 7](https://astro.build) — статическая генерация (SSG).
- **Острова**: [React 18](https://react.dev) через `@astrojs/react` — только для интерактивных форм.
- **Вёрстка и стили**: HTML/CSS/JS исходного шаблона из `public/css` и `public/js` (Bootstrap grid, Swiper, WOW, GSAP, jQuery). Tailwind/Shadcn **не подключены** — приоритет точного переноса шаблона.
- **Контент**: Markdown через Astro Content Collections.
- **Формы**: отправка заявок POST-запросом на n8n (`https://n8n.w1do.ru/webhook/requests`, `project=za-rulem`).
- **Чат водителей**: React-остров `components/driver-chat` работает напрямую с Directus (`PUBLIC_DIRECTUS_URL`, коллекция `driver_chat_messages`): история через REST, новые сообщения через WebSocket с резервным опросом.

Модули чата: `model/` — типы и хуки (`useChatSession` — номер/канал/город, `useChatMessages` — лента и отправка, `useDriverChat` — сборка для UI); `api/chatMessages.ts` — единственная точка обращения к Directus; `lib/` — телефон, настройки в localStorage/URL, уведомления; `ui/` — экран входа, панель каналов, шапка, лента, поле ввода.

Требуется **Node.js >= 22.12.0**.

## 🧞 Команды

Все команды запускаются из корня проекта:

| Команда           | Действие                                          |
| :---------------- | :------------------------------------------------ |
| `npm install`     | Установка зависимостей                            |
| `npm run dev`     | Локальный dev-сервер на `localhost:4321`          |
| `npm run build`   | Сборка продакшн-версии в `./dist/`                |
| `npm run preview` | Локальный предпросмотр собранного сайта           |
| `npm run astro`   | Команды Astro CLI (`astro add`, `astro check`)    |

### Справочник городов (Directus)

Источник истины — коллекция `cities` в Directus (`status: published`). Города редактируются в админке без деплоя.

- `src/lib/cities/` — загрузка городов: `index.ts` (публичный API, `fetchCities` и тип `ChatCity`), `types.ts` (тип `ChatCity`), `api.ts` (запрос и fallback), `config.ts` (адрес Directus, таймаут, TTL), `dto.ts` (поля и валидация записей), `cache.ts` (кеш процесса), `parse.ts` (примитивы разбора).
- `src/data/cities.ts` — ре-экспорт `ChatCity`, `chatCities` (загружается один раз на процесс), `findCity`, URL-хелперы.
- `src/data/cities/fallback.ts` — резервные 36 городов: используются только если Directus недоступен.
- `src/data/cityMeta.ts` — таблица «регион → федеральный округ», формат населения и шаблоны title/description (приоритет у `seo_title`/`seo_description` из Directus).
- Поля Directus: `slug`, `name`, `case_in/of/by/for`, `hint`, `bounds_*`, `center_*`, `region`, `population`, `is_featured`, `is_indexable`, `seo_title`, `seo_description`, `sort`, `status`.
- Регион виден в селекторе города (и участвует в поиске), в блоке «другие локации» и в мета-тегах страницы города.

Адрес API: `DIRECTUS_URL` (рантайм) или `PUBLIC_DIRECTUS_URL`. После правок в Directus достаточно перезапустить сервер — пересборка не нужна.

Кеш городов: список запрашивается не чаще, чем раз в `CITIES_CACHE_TTL_MS` (по умолчанию 600000 мс, `0` отключает кеш). Параллельные рендеры ждут один запрос, а при недоступности Directus отдаётся последний успешный список либо резервный.

### Рендеринг городских страниц

Городские маршруты `src/pages/[city]/**` отдаются по запросу (`export const prerender = false`, адаптер `@astrojs/node` в режиме `standalone`), неизвестный слаг города возвращает 404. Поэтому сборка занимает ~1 минуту и 61 страницу вместо тысяч предгенерированных. Городские URL публикуются в `/sitemap-cities.xml` (по флагу `is_indexable`), он указан в `public/robots.txt` рядом с `sitemap-index.xml`.

## 📁 Структура проекта (FSD-lite)

```text
/
├── public/                 # статика шаблона (css, js, images, favicon)
├── source/                 # эталонная HTML-вёрстка шаблона (референс для переноса)
├── seo/                    # ключевые слова, семантическое ядро по кластерам
├── src/
│   ├── layouts/            # Layout, HubLayout, ServiceLayout, ServiceLandingLayout, BlogLayout
│   ├── components/
│   │   ├── shared/         # header/, footer/, city-selector/ — общие блоки
│   │   ├── home/           # блоки главной страницы
│   │   ├── about/          # блоки страницы «О сервисе»
│   │   ├── hub/            # блоки лендинга хаба услуги (pillar)
│   │   ├── services/       # карточка услуги + cluster/ (spokes), single/
│   │   ├── blog/           # блоки списка и статьи блога
│   │   └── forms/          # React-острова форм (CallbackForm, ContactForm) + хуки
│   ├── content/            # Markdown-контент коллекций (services, blog)
│   ├── content.config.ts   # коллекции: services (pillar), serviceLanding (spokes), blog
│   └── pages/              # маршруты: index, about, contacts, services/*, blog/*
├── astro.config.mjs
├── urls-seo.txt            # карта всех страниц сайта
└── SUMMARY.md              # сжатый контекст текущего состояния проекта
```

## 🧩 Архитектура

- **Компонентный подход**: крупные блоки дробятся на мелкие переиспользуемые `.astro`-компоненты по разделам (`home/`, `about/`, `hub/`, `blog/`).
- **Формы** вынесены в React-острова (`forms/*.tsx`) с логикой в хуках (`useCallbackForm.ts`, `useContactForm.ts`).
- **Контент** статичен и хранится в Markdown-коллекциях `content/`.

### Кластерная структура услуг (pillar → spokes)

- **Pillar (хаб)** — коллекция `services`, файл `src/content/services/<кластер>/index.md` c `hub: true`. Рендерится как полноценный лендинг через `HubLayout`.
- **Spoke (посадочная)** — коллекция `serviceLanding`, файлы `src/content/services/<кластер>/<spoke>.md`.
- Добавить новый spoke = один `.md` в папке услуги; новый кластер = папка + `index.md` с `hub: true`. Роуты трогать не нужно.

Текущие кластеры:

- `tehpomosch` — техпомощь (spokes: прикурить авто, замена аккумулятора, отогрев, подвоз топлива, вытащить из грязи лебёдкой).
- `toplivo` — подвоз топлива (spokes: бензин, дизель).

## 🔍 SEO и контент

- Каждая страница — посадочная под запрос из папки `seo/`.
- Все тексты пишутся на русском языке от первого лица (я, меня), без «вы/компания».
- Правила написания контента и заполнения страниц — в навыках `.junie/skills/seo-write`, `.junie/skills/cluster-pilar-page`, `.junie/skills/source-copy`.
- Актуальная карта страниц ведётся в `urls-seo.txt`.

## 📝 Документация

- **[SUMMARY.md](./SUMMARY.md)** — сжатый контекст текущего состояния проекта (статус, изменения, tech debt, следующие шаги).
- **[idea.md](./idea.md)** — идея и стратегия наполнения сайта.
- Правила документирования — `.junie/skills/documentation/SKILL.md`.

## Контакты

**Сайт: [AI-инженер](https://w1do.ru)**

**TG: [W1DO_DIGITAL](https://t.me/W1DO_DIGITAL)**

**MAX: [Простите за MAX](https://max.ru/u/f9LHodD0cOKlpm9dqNIVXbxyaDeOEKzC4jizdf-1qeqNIOnm7yL9qs68d58)**

**Мой канал: [YouTube](https://www.youtube.com/@w1do_digital)**

## Для работодателей и нанимателей
- Только удаленка
- Внедрение AI / Разработка (Claude, Junie, Codex)
