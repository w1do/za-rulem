# za-rulem — техпомощь на дороге в Тюмени

Сайт автопомощи на дорогах Тюмени и области. Помогает быстро найти нужную услугу (прикурить авто, замена аккумулятора, подвоз топлива, отогрев, вытаскивание из грязи лебёдкой и т.д.) и оставить заявку.

Проект построен как лёгкий статический сайт, заточенный под SEO: каждая страница — посадочная под поисковый запрос, услуги организованы в тематические кластеры (pillar → spokes) для полного охвата интента.

## 🚀 Технологический стек

- **Framework**: [Astro 7](https://astro.build) — статическая генерация (SSG).
- **Острова**: [React 18](https://react.dev) через `@astrojs/react` — только для интерактивных форм.
- **Вёрстка и стили**: HTML/CSS/JS исходного шаблона из `public/css` и `public/js` (Bootstrap grid, Swiper, WOW, GSAP, jQuery). Tailwind/Shadcn **не подключены** — приоритет точного переноса шаблона.
- **Контент**: Markdown через Astro Content Collections.
- **Формы**: отправка заявок POST-запросом на n8n (`https://n8n.w1do.ru/webhook/requests`, `project=za-rulem`).

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

## 📁 Структура проекта (FSD-lite)

```text
/
├── public/                 # статика шаблона (css, js, images, favicon)
├── source/                 # эталонная HTML-вёрстка шаблона (референс для переноса)
├── seo/                    # ключевые слова, семантическое ядро по кластерам
├── src/
│   ├── layouts/            # Layout, HubLayout, ServiceLayout, ServiceLandingLayout, BlogLayout
│   ├── components/
│   │   ├── shared/         # header/, footer/ — общие блоки
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
