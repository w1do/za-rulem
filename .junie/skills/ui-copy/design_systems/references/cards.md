# Reference: карточки в реальной разметке

См. токены и паттерны в `design_systems/cards.md`.

## Карточка-фича (из `src/components/Shared/Why.astro`)
```html
<div class="why-box">
  <div class="why-items right-after wow fadeInUp" data-wow-delay=".3s">
    <div class="why-icon">
      <figure><img src="assets/images/why/icon-1.png" alt="Экономия времени"></figure>
    </div>
    <div class="why-content">
      <h2>Экономия времени</h2>
      <p>Автоматизируйте до 80% рутинных запросов клиентов, освобождая сотрудников.</p>
    </div>
  </div>
  <div class="why-items right-after wow fadeInUp" data-wow-delay=".4s">
    <div class="why-icon">
      <figure><img src="assets/images/why/icon-2.png" alt="Мультимодальность"></figure>
    </div>
    <div class="why-content">
      <h2>Мультимодальность</h2>
      <p>ИИ понимает текст, голос и работает со сложными таблицами.</p>
    </div>
  </div>
</div>
```

## Карточка тарифа (паттерн `.pricing-item`)
```html
<div class="pricing-item">
  <div class="pricing-top">
    <div class="pricing-top-icon">
      <figure><img src="assets/images/pricing/icon-1.png" alt="Старт"></figure>
    </div>
    <div class="pricing-top-content">
      <h2>$29<span>/мес</span></h2>
      <p>Для небольших команд</p>
    </div>
  </div>
  <div class="pricing-content">
    <div class="pricing-tag"><span>Популярный</span></div>
    <div class="pricing-list">
      <div class="check-list">
        <ul>
          <li><i class="fa-solid fa-check"></i> До 1000 запросов</li>
          <li><i class="fa-solid fa-check"></i> 1 база знаний</li>
        </ul>
      </div>
    </div>
    <div class="pricing-button-wapper">
      <a href="/contact" class="theme-button style-1">
        <span data-text="Выбрать план">Выбрать план</span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    </div>
  </div>
</div>
```

> Для Astro выноси массив карточек в `Astro.props` и рендерь через `items.map(...)`,
> как сделано в `Why.astro` (синхронно с навыком `landing-copy`).
