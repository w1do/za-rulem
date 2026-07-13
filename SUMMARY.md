# SUMMARY — za-rulem (техпомощь на дороге в Тюмени)

Сжатый контекст текущего состояния проекта для LLM и разработчика.

## Current Status

Инициализирован сайт на **Astro 7** (статическая генерация) с интеграцией **@astrojs/react** (для форм-островов). Собрана главная страница по эталонной вёрстке `source/index-3.html` (вариант «gold»), поднята кластерная структура услуг (pillar → spokes), раздел блога и форма заявки с отправкой в n8n. `npm run build` — зелёный, генерируется 11 страниц.

Стек: Astro + React (острова) + вёрстка/стили исходного шаблона из `public/css`, `public/js` (Bootstrap grid, Swiper, WOW, GSAP, jQuery). Tailwind/Shadcn НЕ подключались — соблюдён приоритет точного переноса шаблона и совместимость с классами `custom.css`.

## Архитектура (FSD-lite)

- `src/layouts/` — `Layout.astro` (общий каркас: head, SEO, подключение CSS/JS шаблона, preloader), `ServiceLayout.astro` (хаб услуги), `ServiceLandingLayout.astro` (посадочная-spoke), `BlogLayout.astro` (статья).
- `src/components/shared/header/` — `Header.astro` + `HeaderNav.astro`.
- `src/components/shared/footer/` — `Footer.astro`.
- `src/components/home/` — 12 блоков главной: `HomeHero`, `HomeAbout`, `HomeServices`, `HomeWhyChoose`, `HomeFleets`, `HomeWhatWeDo`, `HomeCollection`, `HomeDrivers`, `HomeHowItWork`, `HomeTestimonials`, `HomePricing`, `HomeBlog`.
- `src/components/services/cluster/` — `ClusterSpokes.astro`, `SpokeCard.astro`.
- `src/components/forms/` — `CallbackForm.tsx` (React-остров) + хук `useCallbackForm.ts` (POST на n8n `https://n8n.w1do.ru/webhook/requests`, project=`za-rulem`).
- `src/content.config.ts` — коллекции `services` (pillar, glob `*/index.md` + `generateId`), `serviceLanding` (spokes, glob `*/*.md` + `!*/index.md`), `blog`.
- `src/pages/` — `index.astro`; `services/index.astro`, `services/[cluster]/index.astro` (единый хаб-роут), `services/[cluster]/[post].astro` (spokes); `blog/index.astro`, `blog/[...slug].astro`.

## Кластерная структура услуг

- Эталон и первый кластер — услуга `tehpomosch` (главный запрос «техпомощь Тюмень»).
- Pillar: `src/content/services/tehpomosch/index.md` (`hub: true`, offers/features/process/pricing/faqs).
- Spokes: `prikurit-avto`, `zamena-akkumulyatora`, `otogrev-avto`, `podvoz-topliva` (перелинковка хаб↔spoke↔сосед).
- Добавление нового spoke = один `.md` в папке услуги; новой услуги-кластера = папка + `index.md` с `hub: true` (роуты трогать не нужно).

## Recent Changes

- Настроен `astro.config.mjs` (site + react integration), установлены `react`, `react-dom`, `@astrojs/react`.
- Перенесена вёрстка `index-3.html` в компоненты Astro, тексты переписаны на русский от первого лица под тему техпомощи.
- Форма заявки вынесена в React-хук, интегрирована на главной, в услугах и посадочных (секция `#contact`).
- Написан SEO-контент: pillar + 4 spokes + 3 статьи блога.
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
