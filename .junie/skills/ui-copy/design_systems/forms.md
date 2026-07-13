# Формы (Forms)

Источник: `public/assets/css/main.css`, строки 395–559.

## Поля ввода — `input`, `.form-control`, `.form-select` (строки 454–466)
| Свойство | Значение |
|----------|----------|
| `width` | `100%` |
| `height` | `52px` |
| `padding` | `10px 15px` |
| `background-color` | `var(--form-input)` (`#343434`) |
| `color` | `var(--white-color)` |
| `border` | `1px solid var(--form-input)` |
| `border-radius` | `100px` (pill) |
| `outline` | `none` |

- Плейсхолдер — `var(--white-color)` (строки 467–471).
- Модификатор `.white-field` — прозрачный фон, тот же бордер.
- **Focus/Hover** (строки 496–514): фон/бордер `--form-input`, без `box-shadow`.

## Textarea
`textarea.form-control` (строки 487–494): радиус `var(--border-radius-three)` (24px; ≤1199px → 20px), остальное как у input.

## Select
`.form-select` (строки 480–485): нативный appearance (`appearance:auto`), без фоновой стрелки.

## Группа поля — `.form-group` (строки 395–452)
- `.form-group` → `margin-bottom: 25px`.
- `.form-group .field-inner` → `position: relative` (для абсолютных лейблов/ошибок).
- `.field-inner label` → `font-size: 14px`.
- `.field-inner .error` → `color: red !important; font-size: 13px`.
- `.form-control.error-border` → подсветка ошибки.

## Чекбоксы и радио (строки 416–434, 528–534)
- `input[type=checkbox|radio]` → `width:auto; height:auto; margin-right:5px`.
- `.field-inner.checkbox input:checked` / `:focus` — кастомные состояния.

## Ответы AJAX — `.ajax-response` (строки 536–549)
| Класс | Фон | Радиус | Паддинг |
|-------|-----|--------|---------|
| `.ajax-response.success` | `green` | `--border-radius-one` (5px) | `15px`, `margin-top:30px` |
| `.ajax-response.error` | `red` | `--border-radius-one` | `15px`, `margin-top:30px` |

## Разметка формы
```html
<div class="form-group">
  <div class="field-inner">
    <label for="email">Email</label>
    <input id="email" type="email" class="form-control" placeholder="you@example.com" required>
    <span class="error"></span>
  </div>
</div>
<button type="submit" class="theme-button style-1">
  <span data-text="Отправить">Отправить</span>
  <i class="fa-solid fa-arrow-right"></i>
</button>
```
