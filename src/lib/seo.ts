// Централизованные данные о бизнесе и билдеры структурированных данных (Schema.org / JSON-LD).
// Используется базовым Layout (базовый граф WebSite + LocalBusiness) и страницами/лейаутами
// для добавления страничных узлов (BreadcrumbList, Service, Article, FAQPage, WebPage).

export const SITE = {
	name: 'За рулём',
	brand: 'За рулём — техпомощь на дороге в Тюмени',
	description:
		'Круглосуточная автопомощь и техпомощь на дороге в Тюмени с выездом: прикурю авто, заменю аккумулятор, отогрею машину, привезу топливо, вскрою автомобиль, вызову эвакуатор.',
	url: 'https://za-rulem.org',
	phone: '+7 908 871-20-26',
	phoneHref: '+79088712026',
	email: 'info@za-rulem.org',
	logo: 'https://za-rulem.org/images/logo.svg',
	image: 'https://za-rulem.org/images/logo.svg',
	addressLocality: 'Тюмень',
	addressRegion: 'Тюменская область',
	addressCountry: 'RU',
	geo: { latitude: 57.153033, longitude: 65.534328 },
	areaServed: ['Тюмень', 'Тюменская область'],
	priceRange: '₽₽',
	openingHours: 'Mo-Su 00:00-24:00',
	sameAs: ['https://wa.me/79088712026'],
} as const;

// Идентификаторы узлов графа (для перекрёстных ссылок @id).
export const BUSINESS_ID = `${SITE.url}/#business`;
export const WEBSITE_ID = `${SITE.url}/#website`;

/** Приводит относительный путь к абсолютному URL сайта. */
export function abs(path: string): string {
	if (/^https?:\/\//.test(path)) return path;
	return new URL(path, SITE.url).href;
}

type FaqItem = { question: string; answer: string };
type BreadcrumbItem = { name: string; url: string };

/** Узел WebSite для базового графа. */
export function websiteNode() {
	return {
		'@type': 'WebSite',
		'@id': WEBSITE_ID,
		url: `${SITE.url}/`,
		name: SITE.brand,
		description: SITE.description,
		inLanguage: 'ru-RU',
		publisher: { '@id': BUSINESS_ID },
	};
}

/** Узел LocalBusiness (автопомощь на дороге) для базового графа. */
export function businessNode() {
	return {
		'@type': ['LocalBusiness', 'AutomotiveBusiness'],
		'@id': BUSINESS_ID,
		name: SITE.brand,
		description: SITE.description,
		url: `${SITE.url}/`,
		image: SITE.image,
		logo: SITE.logo,
		telephone: SITE.phone,
		email: SITE.email,
		priceRange: SITE.priceRange,
		currenciesAccepted: 'RUB',
		paymentAccepted: 'Наличные, банковская карта, перевод',
		address: {
			'@type': 'PostalAddress',
			addressLocality: SITE.addressLocality,
			addressRegion: SITE.addressRegion,
			addressCountry: SITE.addressCountry,
		},
		geo: {
			'@type': 'GeoCoordinates',
			latitude: SITE.geo.latitude,
			longitude: SITE.geo.longitude,
		},
		areaServed: SITE.areaServed.map((name) => ({
			'@type': 'AdministrativeArea',
			name,
		})),
		openingHoursSpecification: {
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
			opens: '00:00',
			closes: '23:59',
		},
		contactPoint: {
			'@type': 'ContactPoint',
			telephone: SITE.phone,
			contactType: 'customer service',
			areaServed: 'RU',
			availableLanguage: 'Russian',
		},
		sameAs: SITE.sameAs,
	};
}

/** Базовый граф: WebSite + LocalBusiness, присутствует на всех страницах. */
export function baseGraph() {
	return [websiteNode(), businessNode()];
}

/** Хлебные крошки. Элементы принимают абсолютные или относительные URL. */
export function breadcrumbNode(items: BreadcrumbItem[]) {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: abs(item.url),
		})),
	};
}

/** Веб-страница общего типа (About/Contact/Collection и т.п.). */
export function webPageNode(opts: {
	type?: string;
	name: string;
	description: string;
	url: string;
}) {
	return {
		'@type': opts.type ?? 'WebPage',
		name: opts.name,
		description: opts.description,
		url: abs(opts.url),
		inLanguage: 'ru-RU',
		isPartOf: { '@id': WEBSITE_ID },
		about: { '@id': BUSINESS_ID },
	};
}

/** Услуга техпомощи. */
export function serviceNode(opts: {
	name: string;
	description: string;
	url: string;
	serviceType?: string;
}) {
	return {
		'@type': 'Service',
		name: opts.name,
		description: opts.description,
		url: abs(opts.url),
		serviceType: opts.serviceType ?? 'Техпомощь на дороге',
		provider: { '@id': BUSINESS_ID },
		areaServed: SITE.areaServed.map((name) => ({ '@type': 'AdministrativeArea', name })),
		availableChannel: {
			'@type': 'ServiceChannel',
			servicePhone: {
				'@type': 'ContactPoint',
				telephone: SITE.phone,
				contactType: 'customer service',
			},
		},
	};
}

/** Статья блога. */
export function articleNode(opts: {
	title: string;
	description: string;
	url: string;
	image?: string;
	author?: string;
	datePublished?: string;
	dateModified?: string;
}) {
	return {
		'@type': 'BlogPosting',
		headline: opts.title,
		description: opts.description,
		url: abs(opts.url),
		mainEntityOfPage: abs(opts.url),
		...(opts.image ? { image: abs(opts.image) } : {}),
		...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
		...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
		inLanguage: 'ru-RU',
		author: { '@type': 'Person', name: opts.author ?? SITE.brand },
		publisher: { '@id': BUSINESS_ID },
	};
}

/** Блок вопросов и ответов. Возвращает null при пустом списке. */
export function faqNode(faqs: FaqItem[] | undefined | null) {
	if (!faqs || faqs.length === 0) return null;
	return {
		'@type': 'FAQPage',
		mainEntity: faqs.map((faq) => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: { '@type': 'Answer', text: faq.answer },
		})),
	};
}

/** Список элементов (каталог услуг, лента статей). */
export function itemListNode(items: { name: string; url: string }[]) {
	return {
		'@type': 'ItemList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			url: abs(item.url),
		})),
	};
}
