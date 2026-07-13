# Типографика (Typography)

Источник: `public/assets/css/main.css`. Подключение шрифтов — строка 1 (Google Fonts).

## Шрифты
| Токен | Значение | Где используется |
|-------|----------|------------------|
| `--title-fonts` | `"Unbounded", sans-serif` | Все заголовки h1–h6 |
| `--body-fonts` | `"DM Sans", sans-serif` | `body`, абзацы, контролы |

Импорт (строка 1):
```css
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Unbounded:wght@200..900&display=swap");
```

## Базовый текст
`body` (строки 56–64): `font-size: 16px`, `line-height: 1.6em`, цвет `--text-color`, шрифт `--body-fonts`.
На `≤991px` → `15px / 1.4rem`.

`p` (строки 83–95): `16px / 1.6rem`, `margin-bottom: 20px`; на `≤991px` → `15px / 1.4rem`.

## Заголовки h1–h6
Общее (строки 292–303): цвет `--white-color`, шрифт `--title-fonts`, `font-weight: normal`, `letter-spacing: .2px`.
Ссылки внутри заголовков имеют анимированное подчёркивание (gradient underline), при hover цвет → `--primary-color` (строки 305–321).

| Тег | Базовый размер | ≤1399px | ≤991px | ≤767px |
|-----|----------------|---------|--------|--------|
| `h1` | `72px` (`line-height 1.4em`) | `52px` | `48px` (`1.2em`) | `34px` |
| `h2` | `48px` (`1.4em`) | — | `40px` | `32px` |
| `h3` | `22px` (`1.4em`) | — | — | `20px` |
| `h4` | `1.728rem` | — | — | — |
| `h5` | `1.44rem` | — | — | — |
| `h6` | `1.2rem` | — | — | — |

## Заголовок секции — `.section-title`
Строки 2344–2425. Это основной паттерн заголовка блока.

- Контейнер: `display:flex; flex-direction:column; gap:15px; margin-bottom:50px` (≤991px → `gap:20px; margin-bottom:30px`).
- `.section-title.text-center` → центрируется, `max-width:810px`.
- `.section-title h2` → `text-transform: capitalize; font-weight:500`; адаптив: ≤1399px `38px`, ≤991px `36px`, ≤767px `28px`.
- `.section-title h2 span` → цвет `--primary-color` (акцент).
- `.section-title .sub-title` — бейдж над заголовком: градиентный бордер (primary→extra), `border-radius: var(--border-radius-three)`, `padding:10px 15px 10px 45px`, `font-size:14px; font-weight:500`, иконка-точка слева (`::before`, 30×30, фон `--primary-color`).

Вариант на тёмном фоне — `.section-title-white` (строки 2427+) с аналогичной структурой.

## Разметка заголовка секции
```html
<div class="section-title wow fadeInUp" data-wow-delay=".2s">
  <span class="sub-title">Почему BotSync</span>
  <h2>Почему стоит выбрать нашу <span>RAG-платформу</span>?</h2>
  <p>Опциональный подзаголовок-описание.</p>
</div>
```
