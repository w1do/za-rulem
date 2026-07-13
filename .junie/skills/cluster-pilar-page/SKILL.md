---
name: cluster-pilar-page
description: >
  Как устроены и как создаются кластерные страницы услуг (pillar → spokes) в
  проекте W1DO DIGITAL (Astro + Content Collections). Используй этот навык, когда
  нужно: добавить посадочную под-страницу (spoke) в существующую услугу, создать
  новую услугу-кластер с нуля (достаточно pillar `index.md` c `hub: true` + spokes)
  или понять, почему кластер собирается именно так (glob-паттерны, `generateId`, роутинг,
  макеты, компоненты, перелинковка). Навык описывает РЕАЛЬНУЮ реализацию проекта,
  а не абстрактную схему. Эталон — услуга `ai-assistants-chatbots`. Подробные
  разобранные примеры лежат в папке `examples/` рядом с этим файлом.
---

# Кластерные страницы услуг: pillar → spokes (реализация W1DO)

Этот навык — **точное описание того, как в проекте реализованы кластерные
страницы услуг**: одна услуга (pillar / хаб) и её узкие посадочные под-страницы
(spokes). Здесь описано всё до мелочей: раскладка файлов, коллекции, роутинг,
макеты, компоненты, frontmatter, перелинковка, правила текста и типовые ошибки.
Готовые разобранные примеры — в папке [`examples/`](./examples/).

**Эталонная услуга — `ai-assistants-chatbots`.** Любую новую услугу или spoke
делай точь-в-точь по её образцу. Если сомневаешься — открой файлы эталона и
скопируй структуру, меняя только тексты.

---

## 0. Термины

| Термин | Что это | Где физически |
|--------|---------|---------------|
| **pillar** (хаб-контент) | Главная страница услуги: интро-текст + `offers`/`features`/`faqs`/`process`/`pricing` во frontmatter | `src/content/services/<slug>/index.md` |
| **хаб-роут** | ОДИН общий динамический `.astro`-маршрут, который рендерит pillar и список spokes для всех хабов | `src/pages/services/[cluster]/index.astro` |
| **spoke** (посадочная) | Узкая под-страница услуги под один интент | `src/content/services/<slug>/<spoke>.md` |
| **`<slug>`** | slug услуги = имя папки (напр. `ai-assistants-chatbots`) | — |
| **`<spoke>`** | slug под-страницы = имя `.md`-файла (напр. `telegram-chatbot`) | — |

URL-контракты (неизменны):
- хаб услуги → `/services/<slug>`
- посадочная → `/services/<slug>/<spoke>`
- общий список услуг → `/services`

---

## 1. Раскладка файлов: одна услуга = одна папка

Всё содержимое одной услуги лежит в **одной папке** `src/content/services/<slug>/`:
pillar называется `index.md`, spoke-файлы — `<spoke>.md` (любое имя, кроме
`index.md`). В корне `src/content/services/` `.md`-файлов быть НЕ должно.

```
src/
├── content/
│   └── services/
│       └── ai-assistants-chatbots/        ← папка услуги (= <slug>)
│           ├── index.md                    ← pillar (hub: true)
│           ├── telegram-chatbot.md         ← spoke
│           ├── website-chatbot.md          ← spoke
│           └── support-chatbot.md          ← spoke
└── pages/
    └── services/
        ├── index.astro                     ← общий список услуг → /services
        ├── [cluster]/
        │   ├── index.astro                 ← ОДИН хаб-роут ВСЕХ услуг → /services/<slug>
        │   └── [post].astro                ← динамический роут ВСЕХ spokes
        └── [...slug].astro                 ← роут одиночных (не-hub) услуг
```

> **Важно:** отдельной папки `src/pages/services/<slug>/` под каждую услугу
> больше НЕТ. Все хабы генерирует один динамический маршрут
> `src/pages/services/[cluster]/index.astro` через `getStaticPaths`. Чтобы
> добавить новую услугу-хаб, `.astro`-файлы создавать не нужно — достаточно
> pillar `index.md` с `hub: true`.

> **Почему так.** Раньше pillar лежал «россыпью» как `services/<slug>.md`, а
> spokes — в папке `services/<slug>/`. Рядом соседствовали десятки `.md` и
> папок. Мы сгруппировали каждый кластер в одну папку — визуально видно, что
> pillar и его spokes это единое целое. URL и `entry.id` при этом НЕ изменились
> (см. раздел 2).

---

## 2. Коллекции и загрузчики (`src/content.config.ts`)

Услуги разнесены по **двум** коллекциям. Разница между pillar и spoke держится
на glob-паттернах загрузчиков. Полный разобранный пример —
[`examples/01-content.config.ts.md`](./examples/01-content.config.ts.md).

### `services` — pillar (хабы)

```ts
const servicesCollection = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: "./src/content/services",
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({ /* см. раздел 6 */ }),
});
```

- `pattern: '*/index.md'` — ловит только `<slug>/index.md`, то есть только
  pillar-файлы.
- `generateId: ({ entry }) => entry.replace(/\/index\.md$/, '')` — **ключевой
  трюк.** Без него `entry.id` был бы `<slug>/index` и сломал бы URL. Регулярка
  отбрасывает хвост `/index.md`, поэтому `entry.id` снова `<slug>`, и весь
  остальной код (список услуг, динамический хаб-роут, `[...slug].astro`) работает без правок.

### `serviceLanding` — spokes (посадочные)

```ts
const serviceLandingCollection = defineCollection({
  loader: glob({ pattern: ['*/*.md', '!*/index.md'], base: "./src/content/services" }),
  schema: z.object({ /* см. раздел 6 */ }),
});
```

- `'*/*.md'` — ловит все `.md` внутри папок услуг.
- `'!*/index.md'` — **негативный паттерн**, исключает pillar `index.md`, иначе он
  попал бы в список посадочных. Массив паттернов с исключением поддерживается
  загрузчиком (tinyglobby в Astro).
- `entry.id` у spoke остаётся `<slug>/<spoke>`.

### Итоговая карта «файл → коллекция → id → URL»

| Файл | Коллекция | `entry.id` | URL |
|------|-----------|-----------|-----|
| `services/<slug>/index.md` | `services` | `<slug>` (через `generateId`) | `/services/<slug>` |
| `services/<slug>/<spoke>.md` | `serviceLanding` | `<slug>/<spoke>` | `/services/<slug>/<spoke>` |

---

## 3. Роутинг

Три файла в `src/pages/services/` (менять их при добавлении контента
**не нужно**). Разобранные примеры — [`examples/04-hub-index.astro.md`](./examples/04-hub-index.astro.md)
и [`examples/05-routing.md`](./examples/05-routing.md).

### 3.1. Единый хаб-роут `src/pages/services/[cluster]/index.astro`

ОДИН динамический маршрут генерирует страницы ВСЕХ хабов. В `getStaticPaths` он
берёт из коллекции `services` все pillar c `hub: true`, а для каждого — собирает
его spokes из `serviceLanding` и передаёт в `ServiceLayout`. **Отдельный
`.astro`-файл под каждую услугу больше НЕ нужен** — добавление новой услуги-хаба
сводится к созданию pillar `index.md` с `hub: true`.

```astro
---
import { getCollection, render } from 'astro:content';
import ServiceLayout from '../../../layouts/ServiceLayout.astro';

export async function getStaticPaths() {
  const hubs = await getCollection('services', ({ data }) => data.hub === true);
  const spokes = await getCollection('serviceLanding');
  return hubs.map((pillar) => ({
    params: { cluster: pillar.id },
    props: {
      pillar,
      spokes: spokes
        .filter(({ data }) => data.cluster === pillar.id)
        .sort((a, b) => a.data.order - b.data.order)
        .map((entry) => ({
          title: entry.data.title,
          description: entry.data.description,
          excerpt: entry.data.excerpt,
          icon: entry.data.icon,
          tags: entry.data.tags,
          url: `/services/${pillar.id}/${entry.id.split('/').pop()}`,
        })),
    },
  }));
}

const { pillar, spokes } = Astro.props;
const { Content } = await render(pillar);
---

<ServiceLayout frontmatter={pillar.data} spokes={spokes}>
  <Content />
</ServiceLayout>
```

> **Почему единый маршрут, а не папка на услугу.** Раньше под каждую услугу
> лежал свой `src/pages/services/<slug>/index.astro`, отличавшийся ровно одной
> строкой `const cluster`. 22 почти одинаковых файла — лишний шум и ручная
> работа при добавлении услуги. Теперь `[cluster]/index.astro` через
> `getStaticPaths` порождает те же самые страницы `/services/<slug>` из данных
> коллекции, а хаб-фильтр `data.hub === true` разводит его с `[...slug].astro`
> (тот берёт `data.hub !== true`), поэтому маршруты не конфликтуют.

### 3.2. Динамический роут spokes `src/pages/services/[cluster]/[post].astro`

Генерирует страницы для ВСЕХ записей `serviceLanding`. Добавил новый `.md`-spoke
→ страница появилась автоматически, ничего дописывать не надо.

```astro
export async function getStaticPaths() {
  const entries = await getCollection('serviceLanding');
  return entries.map(entry => ({
    params: { cluster: entry.data.cluster, post: entry.id.split('/').pop() },
    props: { entry },
  }));
}
```

Обрати внимание: сегмент URL берётся из **имени файла**
(`entry.id.split('/').pop()`), а `cluster` — из frontmatter-поля `cluster`.

### 3.3. Роут одиночных услуг `src/pages/services/[...slug].astro`

Рендерит услуги, которые **не являются хабом**. Хабы исключены фильтром
`data.hub !== true`, чтобы не было дубликата маршрута с хаб-роутом.

```astro
const entries = await getCollection('services', ({ data }) => data.hub !== true);
```

> **Вывод:** как только в pillar стоит `hub: true` — услуга рендерится через
> единый хаб-роут `[cluster]/index.astro`; иначе через `[...slug].astro` как
> простая одиночная страница. Отдельные `.astro`-файлы создавать не нужно.

---

## 4. Макеты

- **`src/layouts/ServiceLayout.astro`** — макет хаба. Принимает `frontmatter`
  (данные pillar) и `spokes` (список). Рисует сайдбар «Другие услуги», картинку,
  тело pillar (`<slot/>`), блок spokes (компонент `ClusterSpokes`), блоки
  `offers`/`features`, затем `Process`/`Pricing`/`Faqs`/`Testimonials`/`Cta`.
- **`src/layouts/ServiceLandingLayout.astro`** — макет посадочной (spoke). Сам
  вычисляет родительский хаб и соседние spokes для сайдбара:

```ts
const cluster = frontmatter.cluster;
const pillar = await getEntry('services', cluster);       // родительский хаб
const hubUrl = `/services/${cluster}`;
const siblings = (await getCollection('serviceLanding', ({ data }) => data.cluster === cluster))
  .sort((a, b) => a.data.order - b.data.order)
  .map((entry) => ({ title: entry.data.title, url: `/services/${cluster}/${entry.id.split('/').pop()}` }));
```

В сайдбаре spoke выводится ссылка «Все услуги направления» (на хаб) + список
соседних spokes. Breadcrumbs и JSON-LD (`Service`, `BreadcrumbList`, `FAQPage`)
строятся автоматически. Менять эти макеты для нового контента НЕ нужно.

---

## 5. Компоненты списка spokes

Блок «Направления услуги» на хабе рисуют два маленьких компонента в
`src/components/services/cluster/`. Полный разбор —
[`examples/06-cluster-components.md`](./examples/06-cluster-components.md).

- **`ClusterSpokes.astro`** — секция-обёртка. Подзаголовок «Направления услуги»,
  заголовок по умолчанию «Другие услуги», внутри — `service-offer-item-list` с
  карточками.
- **`SpokeCard.astro`** — одна карточка. Использует стиль исходной вёрстки
  `service-offer-item box-border-gradiant` (тот же вид, что блок «Что я
  предлагаю»): иконка (с инверсией в белый) + заголовок + описание. **Вся
  карточка — это `<a href>`** на страницу spoke. Иконка по умолчанию —
  `/images/icon-service-offer-list-1.svg`.

> Никаких новых глобальных CSS-классов не вводим — переиспользуем существующие
> из `custom.css` (`service-offer-item-list`, `service-offer-item`,
> `box-border-gradiant`, `icon-box`, `service-offer-item-content`).

---

## 6. Frontmatter

Единственный источник истины по полям — `src/content.config.ts`. Ниже — что
реально заполняем. Полные разобранные образцы:
[`examples/02-pillar-index.md.md`](./examples/02-pillar-index.md.md) и
[`examples/03-spoke.md.md`](./examples/03-spoke.md.md).

### 6.1. pillar (`index.md`, коллекция `services`)

Обязательны: `title`, `description`. Практически всегда заполняем также:

```md
---
layout: ../../layouts/ServiceLayout.astro
title: "AI ассистенты и чат-боты"
hub: true                       # ОБЯЗАТЕЛЬНО — иначе услуга уйдёт в [...slug].astro
seo:
  title: "…70–90 символов, с ключом и брендом | W1DO"
  description: "…140–160 символов"
description: "Короткое описание услуги (идёт в карточку на /services)."
image: /images/services/ai-chat-bot.webp
no: "02"                        # порядковый номер в общем списке услуг
icon: /images/icon-service-2.svg
tags: ["…", "…"]
offersTitle: "…"
offersDescription: "…"
offers:                         # 2 карточки «Что предлагаю»
  - { title: "…", description: "…", icon: "/images/icon-service-offer-list-1.svg" }
featuresTitle: "…"
featuresDescription: "…"
features: ["…", "…", "…", "…"]  # 4 пункта
stats:                          # опционально: счётчики
  - { value: "24", suffix: "/7", label: "…" }
faqs:                           # список Q/A → идёт в FAQPage schema
  - { question: "…", answer: "…" }
process:                        # 4 шага процесса
  title: "…"
  step1Title: "…"; step1Desc: "…"   # … step4Title/step4Desc
pricing:                        # опционально: тарифы
  title: "…"
  items:
    - { title: "…", price: "от … ₽", description: "…", features: ["…"] }
---

Интро-абзац(ы) pillar. В конце — абзац с перелинковкой на 1–2 spoke.
```

### 6.2. spoke (`<spoke>.md`, коллекция `serviceLanding`)

Обязательны по схеме: `cluster`, `title`, `description`, `order` (default 0).

```md
---
layout: ../../../layouts/ServiceLandingLayout.astro   # на уровень глубже, чем pillar!
cluster: ai-assistants-chatbots     # ОБЯЗАН совпадать с именем папки услуги
title: "Чат-бот для Telegram под ключ"
seo:
  title: "…"
  description: "…"
description: "…"
excerpt: "…"                    # текст карточки на хабе
dateLabel: "6 минут чтения"
image: /images/services/ai-chat-bot.webp   # обычно берётся из pillar
imageAlt: "…"
icon: /images/icon-service-offer-list-1.svg   # -1 или -2
order: 1                        # УНИКАЛЬНЫЙ в пределах кластера, задаёт порядок
tags: ["…"]
offers: [ …2… ]
features: [ …4… ]
faqs: [ …3… ]
process: { …4 шага… }
---

3–4 абзаца текста. ПОСЛЕДНИЙ абзац ОБЯЗАТЕЛЬНО содержит 1–2 внутренние ссылки
(на соседний spoke и/или на хаб услуги).
```

> ⚠️ Частые расхождения путей `layout`: у pillar `../../layouts/…`, у spoke
> `../../../layouts/…` (spoke на уровень глубже). Проверяй.

---

## 7. Перелинковка (ядро topic cluster)

Обязательная схема ссылок:

- **хаб → все spokes** — автоматически (компонент `ClusterSpokes` + сайдбар).
- **pillar-текст → 1–2 spoke** — вручную, абзацем в конце тела `index.md`.
- **каждый spoke → хаб + 1–2 соседних spoke** — вручную, в ПОСЛЕДНЕМ абзаце тела.
- **сайдбар spoke → хаб + соседи** — автоматически (`ServiceLandingLayout`).

Пример абзаца-перелинковки в spoke (как в эталоне):

```md
Хотите охватить и другие каналы? Посмотрите [чат-бота для сайта](/services/ai-assistants-chatbots/website-chatbot)
или [бота технической поддержки](/services/ai-assistants-chatbots/support-chatbot).
Все решения собраны в разделе услуги [AI ассистенты и чат-боты](/services/ai-assistants-chatbots).
```

Ссылки — абсолютные, вида `/services/<slug>` и `/services/<slug>/<spoke>`, без
завершающего слэша.

---

## 8. Правила текста и SEO

- **От первого лица разработчика:** «я», «меня», «мой». НЕЛЬЗЯ «мы», «наша
  компания», «студия». К клиенту — «вы / ваш». (Исключение: старые pillar-тексты,
  где исторически встречается «мы», намеренно не переписывались — при создании
  НОВОГО контента используем только первое лицо.)
- **1 страница = 1 интент.** Spoke не должны каннибализировать друг друга и хаб.
- **Уникальность** контента между spokes.
- Детальные правила заголовков/меты — навык [`seo-write`](../seo-write/SKILL.md),
  структура посадочной — навык [`landing-copy`](../landing-copy/SKILL.md).
- Контент по тематике сайта генерируй через MCP `rag-content-botsync-w1do`
  (см. `AGENTS.md`), если он доступен.

---

## 9. Подводные камни со стилями (уже исправлены — не сломай снова)

На вложенных URL (`/services/<slug>/<spoke>`) относительные пути в CSS
резолвятся неверно. Поэтому в проекте пути сделаны **абсолютными**:

- `src/styles/custom.css` — фоновые картинки `url('/images/...')` (а не `../images/...`).
- `src/styles/all.min.css` — шрифты Font Awesome `url(/webfonts/...)` (а не
  `../webfonts/...`). Иначе на страницах кластера иконки запрашиваются по
  `/services/webfonts/...` → 404 и пропадают.

Не возвращай относительные пути в этих файлах.

---

## 10. Плейбук A: добавить spoke в существующую услугу

1. Выбери узкий интент из `seo/` (ещё не покрытый).
2. Придумай `<spoke>` slug (латиница, дефисы) = имя файла.
3. Создай `src/content/services/<slug>/<spoke>.md` со ВСЕМ frontmatter (раздел
   6.2): правильный `layout` (`../../../layouts/…`), `cluster: <slug>`,
   уникальный `order`.
4. Текст 3–4 абзаца от первого лица; последний абзац — перелинковка (раздел 7).
5. Добавь ссылку на новый spoke в pillar-текст `index.md` (если уместно).
6. `npm run build` → проверь `/services/<slug>/<spoke>`.

> Роуты и хаб трогать НЕ нужно — spoke подхватится автоматически.

---

## 11. Плейбук B: создать новую услугу-кластер с нуля

1. Создай папку `src/content/services/<slug>/`.
2. В ней pillar `index.md` с `hub: true` и полным frontmatter (раздел 6.1) +
   интро-текст с перелинковкой на будущие spokes.
3. Хаб-роут создавать НЕ нужно — единый `src/pages/services/[cluster]/index.astro`
   подхватит услугу автоматически, как только у pillar стоит `hub: true`.
4. Создай 2–3 spoke-файла по Плейбуку A (шаги 3–4).
5. Настрой перелинковку во все стороны (раздел 7).
6. `npm run build` → проверь хаб `/services/<slug>` и все spokes.

Готовые копируемые заготовки — в [`examples/`](./examples/).

---

## 12. Проверка и чек-лист

```bash
npm run build      # проверяет схемы frontmatter и генерацию всех роутов
npm run preview    # локальный просмотр собранного сайта
```

Чек-лист приёмки:

- [ ] pillar лежит в `services/<slug>/index.md`, в корне `services/` нет `.md`;
- [ ] в pillar стоит `hub: true` (единый хаб-роут подхватит его сам);
- [ ] у каждого spoke `cluster` = имя папки, `order` уникален;
- [ ] `layout` у pillar `../../…`, у spoke `../../../…`;
- [ ] хаб `/services/<slug>` открывается, показывает список spokes;
- [ ] каждый spoke открывается по `/services/<slug>/<spoke>`;
- [ ] перелинковка настроена (хаб↔spoke, spoke↔сосед);
- [ ] в `serviceLanding` нет записей с id, оканчивающимся на `/index`;
- [ ] тексты нового контента — от первого лица («я/меня/мой»);
- [ ] `npm run build` зелёный, число страниц не уменьшилось.

---

## 13. Частые ошибки

- **Забыли `hub: true`** → услуга не попадёт в единый хаб-роут
  `[cluster]/index.astro` (фильтр `data.hub === true`), а уйдёт в `[...slug].astro`
  как простая одиночная страница — без сайдбара и блока spokes.
- **Забыли `generateId`** → id pillar станет `<slug>/index`, URL сломается.
- **Убрали `!*/index.md`** → pillar попадёт в список spokes.
- **Неверный `cluster`** у spoke → страница не попадёт ни в хаб, ни в сайдбар.
- **`.md` в корне `services/`** → файл выпадет из обеих коллекций (его не ловит
  ни `*/index.md`, ни `*/*.md`).
- **Относительные пути в CSS** → битые иконки/картинки на вложенных URL (раздел 9).
- **Неуникальный `order`** → непредсказуемый порядок карточек.

---

## Связанные ресурсы

- [`examples/`](./examples/) — разобранные до мелочей примеры всех файлов кластера.
- `src/content.config.ts` — источник истины по схемам frontmatter.
- Эталон контента: `src/content/services/ai-assistants-chatbots/`; единый хаб-роут: `src/pages/services/[cluster]/index.astro`.
- Навык [`seo-write`](../seo-write/SKILL.md) — правила SEO-текста и меты.
- Навык [`landing-copy`](../landing-copy/SKILL.md) — структура посадочной страницы.
- Навык [`components`](../components/SKILL.md) — дробление вёрстки на компоненты.
- `AGENTS.md` — генерация контента (MCP `rag-content-botsync-w1do`), соглашения проекта.
- `SUMMARY.md` — раздел «Кластерная структура услуг».
