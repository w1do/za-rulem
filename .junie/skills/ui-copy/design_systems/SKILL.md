# Design System — BotSync

Дизайн-система, извлечённая навыком `ui-copy` из `public/assets/css/main.css`.
Тёмная тема с неоново-лаймовым акцентом `#DFFF00`, шрифты Unbounded (заголовки) /
DM Sans (текст), скруглённые элементы (pill-кнопки, карточки с радиусом 24px).

## Навигация по схемам
| Схема | Что внутри |
|-------|------------|
| [colors.md](./colors.md) | Все цветовые токены `:root`, фоны, бордеры, выделение текста |
| [typography.md](./typography.md) | Шрифты, заголовки h1–h6, абзацы, `.section-title`, `.sub-title` |
| [sizes.md](./sizes.md) | Радиусы, высоты контролов, утилиты отступов (5px-шаг), брейкпоинты, сетка |
| [button.md](./button.md) | `.theme-button` + модификаторы `style-1..4`, состояния, разметка |
| [cards.md](./cards.md) | Карточки/боксы: `pricing-item`, `why-items`, аккордеон, токены карточек |
| [forms.md](./forms.md) | Инпуты, textarea, select, чекбоксы/радио, состояния, ajax-response |
| [effects.md](./effects.md) | Переходы, тени, hover, градиентные бордеры, WOW-анимации |

## Примеры использования (references)
| Файл | Демонстрирует |
|------|---------------|
| [references/buttons.md](./references/buttons.md) | Все варианты кнопок в реальной разметке |
| [references/cards.md](./references/cards.md) | Карточки фич и тарифов |
| [references/section-title.md](./references/section-title.md) | Заголовки секций с бейджем |
| [references/page-example.md](./references/page-example.md) | Сборка секции целиком (Astro) |

## Краткая шпаргалка токенов
| Токен | Значение | Назначение |
|-------|----------|------------|
| `--primary-color` | `#DFFF00` | Акцент, CTA, активные состояния |
| `--body-color` | `#0A0708` | Фон страницы |
| `--background-one` | `#191919` | Фон карточек/боксов |
| `--white-color` | `#FFFFFF` | Текст |
| `--border-color-one` | `rgba(255,255,255,.10)` | Бордеры |
| `--border-radius-three` | `24px` | Карточки, бейджи |
| `--title-fonts` | `"Unbounded", sans-serif` | Заголовки |
| `--body-fonts` | `"DM Sans", sans-serif` | Текст |

> Источник всех значений ниже — `public/assets/css/main.css` (номера строк указаны в схемах).
