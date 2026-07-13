# Карточки и боксы (Cards)

Источник: `public/assets/css/main.css`. В проекте карточки реализованы не одним общим
классом, а паттернами внутри секций (`*-item`, `*-box`, `*-items`). Ниже — переиспользуемые
паттерны и их токены.

## Общие токены карточки
| Свойство | Значение / токен |
|----------|------------------|
| Фон | `var(--background-one)` (`#191919`) |
| Бордер | `1px solid var(--border-color-one)` |
| Радиус | `var(--border-radius-three)` (`24px`; ≤1199px → `20px`) |
| Hover-бордер | градиент `linear-gradient(primary → white)` через `padding-box/border-box` |

## Карточка тарифа — `.pricing-item` (строки 8418–8526)
Эталонная карточка.
- Контейнер: фон `--background-one`, бордер `--border-color-one`, радиус 24px, `overflow:hidden`, `margin-bottom:30px`.
- Шапка `.pricing-top`: фон `--extra-color`, радиус 24px, `padding:30px`, `text-align:center`.
- Иконка `.pricing-top-icon figure`: круг `100×100`, фон `--primary-rgb-12`, бордер `1px solid --primary-color`, радиус `100px`.
- Заголовок цены `.pricing-top-content h2`: `38px` (адаптив 24/22px).
- Тело `.pricing-content`: `padding:20px`.
- Бейдж `.pricing-tag span`: фон `--primary-color`, текст `--black-color`, радиус 20px, `padding:4px 20px`, шрифт `--title-fonts`.
- Кнопка в карточке: `.pricing-button-wapper .theme-button { width:100% }`.
- **Hover**: бордер становится прозрачным и заменяется градиентом `primary → white` (border-box), шапка подсвечивается `--primary-rgb-12`.

```html
<div class="pricing-item">
  <div class="pricing-top">
    <div class="pricing-top-icon"><figure><img src="..." alt=""></figure></div>
    <div class="pricing-top-content"><h2>$29</h2><p>В месяц</p></div>
  </div>
  <div class="pricing-content">
    <div class="pricing-tag"><span>Популярный</span></div>
    <div class="pricing-list"><div class="check-list"><ul><li>...</li></ul></div></div>
    <div class="pricing-button-wapper">
      <a href="#" class="theme-button style-1"><span data-text="Выбрать">Выбрать</span><i class="fa-solid fa-arrow-right"></i></a>
    </div>
  </div>
</div>
```

## Карточка-фича — `.why-box / .why-items`
Используется в `src/components/Shared/Why.astro`. Структура «иконка + контент»:
```html
<div class="why-box">
  <div class="why-items right-after wow fadeInUp" data-wow-delay=".3s">
    <div class="why-icon"><figure><img src="assets/images/why/icon-1.png" alt="Заголовок"></figure></div>
    <div class="why-content">
      <h2>Экономия времени</h2>
      <p>Автоматизируйте до 80% рутинных запросов клиентов.</p>
    </div>
  </div>
  <!-- ещё .why-items … -->
</div>
```

## Аккордеон — `.accordion .accordion-item` (строки 561+)
- `.accordion-item`: `margin-bottom:2px`, фон `--extra-color`, `border:none`, `overflow:hidden`.
- Применяется в FAQ-секциях (`src/components/Shared/Faq.astro`).

## Правила
- Карточку строить на токенах: фон `--background-one`, бордер `--border-color-one`, радиус `--border-radius-three`.
- Для эффекта при наведении использовать градиентный бордер через `padding-box/border-box` (см. effects.md).
- Иконки-кружки — фон `--primary-rgb-12` + бордер `--primary-color`.
