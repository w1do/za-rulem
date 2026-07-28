// Централизованные данные о бизнесе и билдеры структурированных данных (Schema.org / JSON-LD).
// Используется базовым Layout (базовый граф WebSite + LocalBusiness) и страницами/лейаутами
// для добавления страничных узлов (BreadcrumbList, Service, Article, FAQPage, WebPage).
import { type ChatCity } from '../data/cities';
import { replaceCityPlaceholders } from './city';

const rawPhone = import.meta.env.PUBLIC_PHONE_NUMBER || import.meta.env.PHONE_NUMBER || '+79088712026';

/** Форматирует номер телефона из формата +79998887766 в +7 (999) 888-77-66. */
export function formatPhoneNumber(phone: string): string {
	const cleaned = ('' + phone).replace(/\D/g, '');
	if (cleaned.length === 11) {
		return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
	}
	return phone;
}

const phone = rawPhone;
const phoneFormatted = formatPhoneNumber(rawPhone);

export const SITE = {
	name: 'За рулём',
	brand: 'За рулём — техпомощь на дороге в {city}',
	description:
		'Круглосуточная автопомощь и техпомощь на дороге в {inCity} с выездом: прикурю авто, заменю аккумулятор, отогрею машину, привезу топливо, вскрою автомобиль, вызову эвакуатор.',
	url: 'https://za-rulem.org',
	email: 'info@za-rulem.org',
	phone,
	phoneFormatted,
	logo: 'https://za-rulem.org/images/logo.svg',
	image: 'https://za-rulem.org/images/logo.svg',
	addressLocality: '{city}',
	addressRegion: 'Тюменская область', // Default region, might need adjustment per city
	addressCountry: 'RU',
	geo: { latitude: 57.153033, longitude: 65.534328 }, // Default geo, might need adjustment
	areaServed: ['{city}'],
	priceRange: '₽₽',
	openingHours: 'Mo-Su 00:00-24:00',
	sameAs: [] as string[],
} as const;

/** Получает данные сайта с учетом города. */
export function getSiteData(city?: ChatCity) {
	const effectiveCity = city || {
		slug: 'tyumen',
		name: 'Тюмень',
		inCity: 'в Тюмени',
		ofCity: 'Тюмени',
		byCity: 'по Тюмени',
		forCity: 'для Тюмени',
	} as ChatCity;

	return {
		...SITE,
		brand: replaceCityPlaceholders(SITE.brand, effectiveCity),
		description: replaceCityPlaceholders(SITE.description, effectiveCity),
		addressLocality: replaceCityPlaceholders(SITE.addressLocality, effectiveCity),
		areaServed: SITE.areaServed.map((s) => replaceCityPlaceholders(s, effectiveCity)),
	};
}

// Идентификаторы узлов графа (для перекрёстных ссылок @id).
export const BUSINESS_ID = `${SITE.url}/#business`;
export const WEBSITE_ID = `${SITE.url}/#website`;
export const PHONE_NUMBER = SITE.phone;
export const PHONE_NUMBER_FORMATTED = SITE.phoneFormatted;

/** Приводит относительный путь к абсолютному URL сайта. */
export function abs(path: string): string {
	if (/^https?:\/\//.test(path)) return path;
	return new URL(path, SITE.url).href;
}

type FaqItem = { question: string; answer: string };
type BreadcrumbItem = { name: string; url: string };

/** Узел WebSite для базового графа. */
export function websiteNode(city?: ChatCity) {
	const site = getSiteData(city);
	return {
		'@type': 'WebSite',
		'@id': WEBSITE_ID,
		url: `${SITE.url}/`,
		name: site.brand,
		description: site.description,
		inLanguage: 'ru-RU',
		publisher: { '@id': BUSINESS_ID },
	};
}

/** Узел LocalBusiness (автопомощь на дороге) для базового графа. */
export function businessNode(city?: ChatCity) {
	const site = getSiteData(city);
	return {
		'@type': ['LocalBusiness', 'AutomotiveBusiness'],
		'@id': BUSINESS_ID,
		name: site.brand,
		description: site.description,
		url: `${SITE.url}/`,
		image: site.image,
		logo: site.logo,
		email: site.email,
		telephone: site.phone,
		priceRange: site.priceRange,
		currenciesAccepted: 'RUB',
		paymentAccepted: 'Наличные, банковская карта, перевод',
		address: {
			'@type': 'PostalAddress',
			addressLocality: site.addressLocality,
			addressRegion: site.addressRegion,
			addressCountry: site.addressCountry,
		},
		geo: {
			'@type': 'GeoCoordinates',
			latitude: site.geo.latitude,
			longitude: site.geo.longitude,
		},
		areaServed: site.areaServed.map((name) => ({
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
			url: `${SITE.url}/contacts`,
			contactType: 'customer service',
			areaServed: 'RU',
			availableLanguage: 'Russian',
		},
		...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
	};
}

/** Базовый граф: WebSite + LocalBusiness, присутствует на всех страницах. */
export function baseGraph(city?: ChatCity) {
	return [websiteNode(city), businessNode(city)];
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
	city?: ChatCity;
}) {
	const site = getSiteData(opts.city);
	return {
		'@type': 'Service',
		name: opts.name,
		description: opts.description,
		url: abs(opts.url),
		serviceType: opts.serviceType ?? 'Техпомощь на дороге',
		provider: { '@id': BUSINESS_ID },
		areaServed: site.areaServed.map((name) => ({ '@type': 'AdministrativeArea', name })),
		availableChannel: {
			'@type': 'ServiceChannel',
			serviceUrl: `${SITE.url}/contacts`,
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
