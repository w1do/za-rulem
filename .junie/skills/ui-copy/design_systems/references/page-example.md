# Reference: сборка секции целиком (Astro)

Полный пример секции, собранной из дизайн-системы: заголовок секции + сетка карточек + CTA.
Структура повторяет реальные компоненты `src/components/Shared/*` и пригодна для копирования.

```astro
---
interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

interface Props {
  subTitle?: string;
  titlePre?: string;
  titleAccent?: string;
  titlePost?: string;
  items?: FeatureItem[];
}

const {
  subTitle = "Возможности",
  titlePre = "Всё для ",
  titleAccent = "умной поддержки",
  titlePost = " клиентов",
  items = [
    { icon: "assets/images/why/icon-1.png", title: "Экономия времени", desc: "Автоматизация до 80% запросов." },
    { icon: "assets/images/why/icon-2.png", title: "Мультимодальность", desc: "Текст, голос и таблицы." },
    { icon: "assets/images/why/icon-3.png", title: "Безопасность", desc: "Конфиденциальность ваших данных." },
  ],
} = Astro.props;
---
<!-- features section start -->
<section class="why-section mlr">
  <div class="why-wapper pt-100 md-pt-80 pb-100 md-pb-80">
    <div class="container">
      <div class="row">
        <div class="col-lg-4">
          <div class="section-title wow fadeInUp" data-wow-delay=".2s">
            <span class="sub-title">{subTitle}</span>
            <h2>{titlePre}<span>{titleAccent}</span>{titlePost}</h2>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="why-box">
            {items.map((item, index) => (
              <div class="why-items right-after wow fadeInUp" data-wow-delay={`${0.3 + index * 0.1}s`}>
                <div class="why-icon"><figure><img src={item.icon} alt={item.title}></figure></div>
                <div class="why-content">
                  <h2>{item.title}</h2>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div class="cta-button wow fadeInUp pt-50" data-wow-delay=".5s">
        <a href="/contact" class="theme-button style-1" aria-label="Запросить демо">
          <span data-text="Запросить демо">Запросить демо</span>
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    </div>
  </div>
</section>
<!-- features section end -->
```

## Чек-лист соответствия дизайн-системе
- [ ] Отступы секции через утилиты `pt-100 md-pt-80 pb-100 md-pb-80`.
- [ ] Заголовок — `.section-title` + `.sub-title` + `<h2>…<span>акцент</span></h2>`.
- [ ] Сетка — Bootstrap `container/row/col-*`.
- [ ] Карточки — паттерн `.why-box / .why-items` (фон/бордер/радиус из токенов).
- [ ] Кнопка — `.theme-button style-1` с `<span data-text>` и `<i class="fa-…">`.
- [ ] Анимации — `wow fadeInUp` + каскадный `data-wow-delay`.
- [ ] Контент и `props` уникальны под SEO-запрос; разметка не изменена.
