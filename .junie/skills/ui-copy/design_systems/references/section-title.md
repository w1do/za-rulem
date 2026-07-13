# Reference: заголовок секции (`.section-title`)

См. `design_systems/typography.md`. Источник — `src/components/Shared/Why.astro`, `Cta.astro`.

## Слева, с бейджем (из Why.astro)
```html
<div class="section-title wow fadeInUp" data-wow-delay=".2s">
  <span class="sub-title">Почему BotSync</span>
  <h2>Почему стоит выбрать нашу <span>RAG-платформу</span>?</h2>
</div>
```

## По центру (`.text-center`)
```html
<div class="section-title text-center wow fadeInUp" data-wow-delay=".2s">
  <span class="sub-title">Возможности</span>
  <h2>Всё для <span>умной поддержки</span> клиентов</h2>
  <p>Краткое описание секции на 1–2 строки.</p>
</div>
```

## На светлом фоне (`.section-title-white`)
```html
<div class="section-title-white text-center">
  <span class="sub-title">Тарифы</span>
  <h2>Прозрачные <span>цены</span></h2>
</div>
```

## Правила
- `<span>` внутри `<h2>` подсвечивается `--primary-color` — выделяй им ключевое слово (LSI/SEO-акцент).
- Бейдж `.sub-title` имеет градиентный бордер и иконку-точку слева (`::before`).
- Текст `.sub-title` и `<h2>` приводятся к `capitalize` — учитывай при подборе фраз.
