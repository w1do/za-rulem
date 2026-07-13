# Кнопки (`.theme-button`)

Источник: `public/assets/css/main.css`, строки 789–1010+.
Базовый класс кнопки — `.theme-button`. Вариант задаётся модификатором `style-1` … `style-4`.

## База `.theme-button` (строки 789–874)
| Свойство | Значение |
|----------|----------|
| `height` | `52px` |
| `font-size` | `16px` (≤767px → `14px`) |
| `font-weight` | `600` |
| `padding` | `10px 15px` |
| `border` | `1px solid transparent` |
| `border-radius` | `100px` (pill) |
| `display` | `inline-flex`, центрирование, `gap: 10px` |
| `text-transform` | `capitalize` |
| `transition` | `500ms all ease` |
| `overflow` | `hidden` (для 3D-анимации текста) |

### 3D-анимация текста
`<span>` внутри кнопки и его `::before` (с `content: attr(data-text)`) создают эффект
«переворота» текста при hover (строки 816–855). **Поэтому `data-text` обязателен** и должен
дублировать видимый текст.

## Модификаторы
| Класс | Фон | Текст | Иконка `i` | Назначение |
|-------|-----|-------|-----------|------------|
| `.style-1` | `--primary-color` | `--black-color` | круглая 24px, чёрный фон, белая стрелка, повёрнута −45° | Главная CTA (строки 875–921) |
| `.style-2` | прозрачный, бордер `--border-color-one` | `--white-color` | круглая 24px, белый фон | Вторичная/контурная (строки 922–970) |
| `.style-3` | `--primary-color` | `--white-color` | стрелка −45° | Альтернативная акцентная (строки 971–995) |
| `.style-4` | `--white-color` | `--black-color` | стрелка −45° | Светлая кнопка (строки 996+) |

### Состояния hover
- `.style-1:hover` → текст становится `--white-color`, span переворачивается (`rotateX(90deg)`), иконка выпрямляется (`rotate(0)`), цвет иконки → `--primary-color`.
- `.style-2:hover` → фон `--primary-color`, бордер `--primary-color`, иконка инвертируется.
- `.style-3/4:hover` → переворот текста + выпрямление иконки.

## Разметка (копировать как есть)
```html
<!-- Главная CTA -->
<a href="/contact" class="theme-button style-1" aria-label="Request a demo">
  <span data-text="Написать">Написать</span>
  <i class="fa-solid fa-arrow-right"></i>
</a>

<!-- Вторичная контурная -->
<a href="/pricing" class="theme-button style-2" aria-label="Тарифы">
  <span data-text="Тарифы">Тарифы</span>
  <i class="fa-solid fa-arrow-right"></i>
</a>
```

## Правила
- Всегда обёртка `<a>`/`<button>` + вложенный `<span data-text="…">` + `<i class="fa-…">`.
- `data-text` = видимому тексту (иначе сломается hover-анимация).
- Не задавать инлайн-цвета — вид кнопки полностью определяется `style-N`.
- Для full-width (например в карточке тарифа) кнопка получает `width:100%` от родителя `.pricing-button-wapper`.
