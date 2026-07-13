# Reference: кнопки в реальной разметке

Примеры применения `.theme-button` (см. `design_systems/button.md`).
Источник паттерна — `src/components/Shared/Cta.astro`.

## CTA (style-1) — из Cta.astro
```html
<div class="cta-button wow fadeInUp" data-wow-delay=".3s">
  <a href="/contact" class="theme-button style-1" aria-label="Request a demo">
    <span data-text="Request a demo">Написать</span>
    <i class="fa-solid fa-arrow-right"></i>
  </a>
</div>
```

## Контурная вторичная (style-2)
```html
<a href="/pricing" class="theme-button style-2" aria-label="Смотреть тарифы">
  <span data-text="Тарифы">Тарифы</span>
  <i class="fa-solid fa-arrow-right"></i>
</a>
```

## Акцентная белым текстом (style-3)
```html
<a href="/demo" class="theme-button style-3">
  <span data-text="Демо">Демо</span>
  <i class="fa-solid fa-play"></i>
</a>
```

## Светлая (style-4)
```html
<a href="/docs" class="theme-button style-4">
  <span data-text="Документация">Документация</span>
  <i class="fa-solid fa-book"></i>
</a>
```

## Кнопка во всю ширину (внутри карточки тарифа)
```html
<div class="pricing-button-wapper">
  <a href="#" class="theme-button style-1">
    <span data-text="Выбрать план">Выбрать план</span>
    <i class="fa-solid fa-arrow-right"></i>
  </a>
</div>
```

> Памятка: `data-text` обязан совпадать с видимым текстом — иначе 3D-анимация при hover ломается.
