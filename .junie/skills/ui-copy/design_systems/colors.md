# Цвета (Color Tokens)

Источник: `public/assets/css/main.css` → блок `:root` (строки 2–23).
Все цвета задаются как CSS-переменные. **Никогда** не хардкодить значения — использовать `var(--…)`.

## Палитра
| Токен | HEX / RGBA | Назначение |
|-------|-----------|------------|
| `--primary-color` | `#DFFF00` | Главный акцент: CTA, активные табы, иконки, span-акценты в заголовках |
| `--primary-rgb-12` | `rgba(221, 255, 0, 0.123)` | Полупрозрачный акцент: фон иконок, подложки |
| `--white-color` | `#FFFFFF` | Текст, заголовки, белые кнопки |
| `--black-color` | `#000000` | Текст на акцентных/белых кнопках |
| `--text-color` | `#FFFFFF` | Базовый цвет текста `body` |
| `--body-color` | `#0A0708` | Фон страницы (`body`) |
| `--footer-color` | `#0A0708` | Фон футера |
| `--background-one` | `#191919` | Фон карточек и боксов |
| `--extra-color` | `#0A0708` | Доп. тёмный фон (верх карточек, аккордеон) |
| `--extra-color-two` | `#221F20` | Доп. фон секций |
| `--extra-color-three` | `#343434` | Доп. серый фон |
| `--form-input` | `#343434` | Фон и бордер инпутов |
| `--border-color-one` | `rgba(255,255,255,0.10)` | Тонкие бордеры карточек/секций |

## Выделение текста (`::selection`)
Строки 25–41: при выделении текста фон становится `--primary-color`, цвет — `--black-color`, `text-shadow: none`.

```css
::selection {
  text-shadow: none;
  background: var(--primary-color);
  color: var(--black-color);
}
```

## Семантика применения
- **Акцентная кнопка / CTA** → фон `--primary-color`, текст `--black-color`.
- **Вторичная кнопка** → прозрачный фон, бордер `--border-color-one`, текст `--white-color`.
- **Карточка** → фон `--background-one`, бордер `--border-color-one`.
- **Ссылка при hover** → цвет `--primary-color`.
- **Акцент внутри заголовка** → `<h2>текст <span>акцент</span></h2>`, где `span { color: var(--primary-color) }`.
