# SUMMARY — za-rulem (техпомощь на дороге в Тюмени)

Сжатый контекст текущего состояния проекта для LLM и разработчика.

## Current Status

Инициализирован сайт на **Astro 7** (статическая генерация) с интеграцией **@astrojs/react** (для форм-островов). Собрана главная страница по эталонной вёрстке `source/index-3.html` (вариант «gold»), поднята кластерная структура услуг (pillar → spokes), раздел блога и форма заявки с отправкой в n8n. `npm run build` — зелёный, генерируется 17 страниц.

Стек: Astro + React (острова) + вёрстка/стили исходного шаблона из `public/css`, `public/js` (Bootstrap grid, Swiper, WOW, GSAP, jQuery). Tailwind/Shadcn НЕ подключались — соблюдён приоритет точного переноса шаблона и совместимость с классами `custom.css`.

## Архитектура (FSD-lite)

- `src/layouts/` — `Layout.astro` (общий каркас: head, SEO, подключение CSS/JS шаблона, preloader), `HubLayout.astro` (хаб услуги как полноценный лендинг в стиле `/about`), `ServiceLayout.astro` (старый макет хаба service-single, оставлен как запасной), `ServiceLandingLayout.astro` (посадочная-spoke), `BlogLayout.astro` (статья).
- `src/components/shared/header/` — `Header.astro` + `HeaderNav.astro`.
- `src/components/shared/footer/` — `Footer.astro`.
- `src/components/home/` — 12 блоков главной: `HomeHero`, `HomeAbout`, `HomeServices`, `HomeWhyChoose`, `HomeFleets`, `HomeWhatWeDo`, `HomeCollection`, `HomeDrivers`, `HomeHowItWork`, `HomeTestimonials`, `HomePricing`, `HomeBlog`.
- `src/components/about/` — 10 блоков страницы «О сервисе» (перенос `source/about.html` блок-в-блок): `AboutPageHeader`, `AboutIntro`, `AboutApproach`, `AboutWhyChoose`, `AboutWhatWeDo`, `AboutDrivers`, `AboutCta`, `AboutExpertise`, `AboutFaqs`, `AboutTestimonials`.
- `src/components/services/` — `ServiceCard.astro` (карточка услуги по `services.html`); `cluster/` — `ClusterSpokes.astro`, `SpokeCard.astro`.
- `src/components/hub/` — блоки лендинга хаба услуги (по образцу `about/*`): `HubPageHeader`, `HubIntro` (стиль `about-us` + `<slot />` для тела pillar), `HubServices` (карточки услуг из споков на базе `ServiceCard` — перелинковка на посадочные), `HubApproach`, `HubWhyChoose`, `HubWhatWeDo`, `HubProcess` (шаги из frontmatter, стиль `how-it-work-gold`), `HubCta`, `HubExpertise`, `HubFaqs` (аккордеон из frontmatter `faqs`), `HubTestimonials`.
- `src/components/blog/` — блоки блога, перенесённые из `source/blog.html` и `source/blog-single.html`: `BlogPageHeader.astro` (шапка списка), `PostCard.astro` (карточка поста), `BlogPagination.astro` (постраничная навигация); `BlogSingleHeader.astro` (шапка статьи с мета-данными), `BlogSingleImage.astro` (обложка), `BlogPostTagLinks.astro` → `BlogPostTags.astro` + `BlogPostShare.astro` (теги и соцшеринг).
- `src/components/forms/` — `CallbackForm.tsx` (React-остров, компактная заявка) + хук `useCallbackForm.ts`; `ContactForm.tsx` (React-остров страницы контактов, разметка формы блок-в-блок из `contact.html`) + хук `useContactForm.ts` (переиспользует `CALLBACK_ENDPOINT`). Все формы POST на n8n `https://n8n.w1do.ru/webhook/requests`, project=`za-rulem`.
- `src/content.config.ts` — коллекции `services` (pillar, glob `*/index.md` + `generateId`), `serviceLanding` (spokes, glob `*/*.md` + `!*/index.md`), `blog`.
- `src/pages/` — `index.astro`, `about.astro` (страница «О сервисе»), `contacts.astro` (страница контактов с формой); `services/index.astro`, `services/[cluster]/index.astro` (единый хаб-роут), `services/[cluster]/[post].astro` (spokes); `blog/index.astro`, `blog/[...slug].astro`.

## Кластерная структура услуг

- Эталон и первый кластер — услуга `tehpomosch` (главный запрос «техпомощь Тюмень»).
- Pillar: `src/content/services/tehpomosch/index.md` (`hub: true`, offers/features/process/pricing/faqs).
- Spokes: `prikurit-avto`, `zamena-akkumulyatora`, `otogrev-avto`, `podvoz-topliva`, `vytaschit-iz-gryazi-lebedkoy` (вытащить авто из грязи лебёдкой — Нива, УАЗ) (перелинковка хаб↔spoke↔сосед).
- Второй кластер — услуга `toplivo` (главный запрос «подвоз топлива Тюмень»). Pillar: `src/content/services/toplivo/index.md` (`hub: true`). Spokes: `podvoz-benzina` (бензин 92/95/98/100), `podvoz-dizelya` (дизель, помощь с прокачкой системы). Перелинковка хаб↔spoke↔сосед, ссылки добавлены в меню шапки и подвал.
- Добавление нового spoke = один `.md` в папке услуги; новой услуги-кластера = папка + `index.md` с `hub: true` (роуты трогать не нужно).
- Хаб `/services/tehpomosch` рендерится через `HubLayout` — полноценный лендинг (интро, карточки услуг для перелинковки, подход, «почему я», процесс, CTA, опыт, FAQ, отзывы). Блоки процесса и FAQ берутся из frontmatter, карточки услуг — из споков.

## Recent Changes

- Настроен `astro.config.mjs` (site + react integration), установлены `react`, `react-dom`, `@astrojs/react`.
- Перенесена вёрстка `index-3.html` в компоненты Astro, тексты переписаны на русский от первого лица под тему техпомощи.
- Форма заявки вынесена в React-хук, интегрирована на главной, в услугах и посадочных (секция `#contact`), а также на отдельной странице `/contacts`.
- Добавлены полноценные страницы `/about` (по `source/about.html`) и `/contacts` (по `source/contact.html`); навигация в шапке, подвале и CTA услуг переведена с якорей `/#about`/`/#contact` на реальные маршруты `/about`/`/contacts`.
- Страница `/about` приведена в точное соответствие референсу `source/about.html` и разбита на переиспользуемые компоненты `src/components/about/*.astro`; добавлены ранее отсутствовавшие секции «Наши экипажи» (`our-driver`), «Мой опыт»/навыки (`our-expertise` + `skillbar`), «Частые вопросы» (`our-faqs` аккордеон) и «Отзывы» (`our-testimonials` swiper `testimonial-slider`) в порядке референса; тексты на русском от первого лица.
- Каталог `/services` перевёрстан под `services.html` (сетка `service-item`, источник — spokes); детальная услуга — под `service-single.html` (сайдбар `page-category-list` + `sidebar-cta`, картинка, FAQ-аккордеон); хаб и блог получили шапку `page-header parallaxie` с хлебными крошками; карточки услуги и поста вынесены в компоненты.
- Страница `/contacts` приведена в точное соответствие референсу `source/contact.html`: добавлена недостающая секция `Google Map` (локализована на Тюмень), форма заявки заменена на `ContactForm` с сеткой `form-group col-md-6 mb-4`/`mb-5` — поля больше не сливаются.
- Страницы блога `/blog` и статьи (`BlogLayout`) приведены в точное соответствие референсам `source/blog.html` и `source/blog-single.html` (блок-в-блок) и разбиты на переиспользуемые компоненты `src/components/blog/*.astro`: список получил недостающий блок пагинации, а страница статьи — секции `page-header parallaxie` с `post-single-meta`, `post-image`, `post-entry` и `post-tag-links` (теги + соцшеринг) вместо прежней несоответствующей вёрстки.
- Контент статей блога приведён к точной структуре поста из `source/blog-single.html`: в каждой статье теперь есть цитата (`blockquote`), заголовки `h2` и подзаголовки `h3` внутри `post-entry` (стилизуются CSS по тегам, класс `wow` не требуется).
- Хаб-услуга `tehpomosch` превращена в полноценный лендинг (как `/about`): создан макет `HubLayout` и набор блоков `src/components/hub/*`, хаб-роут `services/[cluster]/index.astro` переключён с `ServiceLayout` на `HubLayout`; добавлен блок карточек услуг (`HubServices` на базе `ServiceCard`) для перелинковки на все споки.
- Написан SEO-контент: pillar + 5 spokes + 3 статьи блога.
- Добавлен кластер `toplivo` (подвоз топлива): pillar `index.md` (`hub: true`) под запрос «подвоз топлива» + 2 spoke `podvoz-benzina` и `podvoz-dizelya`; перелинковка во все стороны, новые URL в `urls-seo.txt`, пункты меню в `HeaderNav`/`Footer`.
- Добавлен spoke `vytaschit-iz-gryazi-lebedkoy` (вытаскивание застрявшего авто лебёдкой, включая Ниву и УАЗ): полный frontmatter, перелинковка на хаб и соседние услуги, ссылка добавлена в текст pillar и в `urls-seo.txt`.
- Заведены `urls-seo.txt` (карта страниц) и данная документация.

## Tech Debt

- `package.json` не содержит скриптов `check`/`format`/`lint` и `@astrojs/check`/`typescript` — проверка типов не запускалась (только `npm run build`).
- Файл `seo/автопомощь.txt` содержит ключи не по теме (LLM/ИИ) — под тематику техпомощи семантику нужно собрать заново; текущий контент написан по навыку `seo-write` от темы, а не от ключей.
- Иконки карточек берутся из существующих `icon-service-*.svg` шаблона; при появлении собственных иконок услуг заменить.
- Форма отправляет заявку напрямую в n8n с фронтенда (CORS/anti-spam на стороне вебхука не проверялись).

## Next Steps

- Пересобрать семантику `seo/` под техпомощь и расширить кластер новыми spokes (эвакуатор, вскрытие авто, буксировка, замена колеса).
- Добавить отдельный кластер `landing` для узких посадочных под коммерческие запросы.
- Подключить `npm run check`/`lint`/`format` и `sitemap`/`robots`.
- Наполнить блог по контент-плану, добавить реальные фото и логотип.
