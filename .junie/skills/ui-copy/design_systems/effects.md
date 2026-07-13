# Эффекты: переходы, тени, анимации (Effects)

Источник: `public/assets/css/main.css` (`:root` строки 2–23) + вендорные `animate.css` / `swiper-bundle.min.css`.

## Токены эффектов
| Токен | Значение | Применение |
|-------|----------|------------|
| `--transition` | `all 0.5s ease-in-out` | Базовый переход |
| `--box-shadow` | `0 14px 28px -20px rgba(16,24,40,.24)` | Тень блоков/карточек |

Кнопки и многие элементы используют локальный `transition: 500ms all ease`.

## Hover-паттерны
- **Ссылки/заголовки**: анимированное подчёркивание (gradient underline, `background-size` 0→100%), цвет → `--primary-color`.
- **Кнопки `.theme-button`**: 3D-переворот текста (`rotateX(90deg) translateY(-12px)`) + поворот иконки `rotate(-45deg) → rotate(0)`.
- **Карточки**: появление градиентного бордера.

## Градиентный бордер (двойной фон)
Ключевой приём оформления (`.sub-title`, `.pricing-item:hover`): бордер рисуется градиентом
через комбинацию `padding-box` + `border-box`.
```css
.element {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--background-one), var(--background-one)) padding-box,
    linear-gradient(to bottom, var(--primary-color), var(--white-color)) border-box;
}
```
Для бейджа `.sub-title` используется горизонтальный градиент `primary → extra → extra → primary`.

## WOW-анимации появления (вендор animate.css + WOW.js)
Элементы появляются при скролле. Паттерн:
```html
<div class="... wow fadeInUp" data-wow-delay=".3s">…</div>
```
- Класс анимации: `fadeInUp` (наиболее частый), также доступны другие из `animate.css`.
- `data-wow-delay` — задержка, обычно шаг `.1s` для каскада (`.2s`, `.3s`, `.4s`…).
- Инициализация WOW.js подключается в `src/components/Layout/Scripts.astro`.

## Слайдеры/попапы (вендор)
- Карусели — `swiper-bundle.min.css` (классы `.swiper`, `.swiper-slide`, навигация `.swiper-button-next/prev`).
- Лайтбоксы — `magnific-popup.min.css`.
- Иконки — Font Awesome (`all.min.css`), классы `fa-solid fa-…`.

## Правила
- Для переходов использовать `var(--transition)` либо `500ms all ease` (как в кнопках).
- Эффект «обводки при наведении» делать только через двойной фон (`padding-box/border-box`), не через `box-shadow`.
- Любой появляющийся блок снабжать `wow fadeInUp` + каскадным `data-wow-delay`.
