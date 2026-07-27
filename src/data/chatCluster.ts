// Справочник городов и видов топлива для кластера «Чат водителей».
// Используется посадочными страницами /chat-voditeley/... и самим чатом
// для привязки диалогов к городам.

export interface ChatCity {
	/** Слаг в URL и в поле city сообщений чата. */
	slug: string;
	/** Название города в именительном падеже. */
	name: string;
	/** «в Тюмени», «в Екатеринбурге» — предложный падеж с предлогом. */
	inCity: string;
	/** «Тюмени», «Екатеринбурга» — родительный падеж. */
	ofCity: string;
	/** Короткая подпись для карточки города. */
	hint: string;
	/** Координаты для карты АЗС. */
	bounds?: {
		minLat: number;
		maxLat: number;
		minLon: number;
		maxLon: number;
	};
}

export interface ChatFuel {
	/** Слаг в URL и topic диалога чата. */
	slug: string;
	/** Короткое название: АИ-95, ДТ. */
	name: string;
	/** Полное название для заголовков. */
	title: string;
	/** Иконка FontAwesome. */
	icon: string;
}

/** Базовый город кластера: его посадочные живут на /chat-voditeley/{fuel}. */
export const DEFAULT_CITY_SLUG = 'tyumen';

export const chatCities: ChatCity[] = [
	{ slug: 'tyumen', name: 'Тюмень', inCity: 'в Тюмени', ofCity: 'Тюмени', hint: 'Базовый город чата', bounds: { minLat: 57.0, maxLat: 57.3, minLon: 65.2, maxLon: 65.9 } },
	{ slug: 'ekaterinburg', name: 'Екатеринбург', inCity: 'в Екатеринбурге', ofCity: 'Екатеринбурга', hint: 'АЗС и трассы Свердловской области', bounds: { minLat: 56.68, maxLat: 56.98, minLon: 60.25, maxLon: 60.95 } },
	{ slug: 'chelyabinsk', name: 'Челябинск', inCity: 'в Челябинске', ofCity: 'Челябинска', hint: 'Город и трасса М-5', bounds: { minLat: 55.01, maxLat: 55.31, minLon: 61.09, maxLon: 61.79 } },
	{ slug: 'surgut', name: 'Сургут', inCity: 'в Сургуте', ofCity: 'Сургута', hint: 'ХМАО: город и зимники', bounds: { minLat: 61.10, maxLat: 61.40, minLon: 73.05, maxLon: 73.75 } },
	{ slug: 'nizhnevartovsk', name: 'Нижневартовск', inCity: 'в Нижневартовске', ofCity: 'Нижневартовска', hint: 'Восток ХМАО', bounds: { minLat: 60.80, maxLat: 61.10, minLon: 76.25, maxLon: 76.95 } },
	{ slug: 'tobolsk', name: 'Тобольск', inCity: 'в Тобольске', ofCity: 'Тобольска', hint: 'Север Тюменской области', bounds: { minLat: 58.05, maxLat: 58.35, minLon: 67.90, maxLon: 68.60 } },
];

export const chatFuels: ChatFuel[] = [
	{ slug: 'ai92', name: 'АИ-92', title: 'Бензин АИ-92', icon: 'fa-gas-pump' },
	{ slug: 'ai95', name: 'АИ-95', title: 'Бензин АИ-95', icon: 'fa-gas-pump' },
	{ slug: 'ai100', name: 'АИ-100', title: 'Бензин АИ-100', icon: 'fa-gauge-high' },
	{ slug: 'dt', name: 'ДТ', title: 'Дизельное топливо', icon: 'fa-truck-moving' },
];

export const getCity = (slug: string) => chatCities.find((c) => c.slug === slug);
export const getFuel = (slug: string) => chatFuels.find((f) => f.slug === slug);

/** Ссылка на посадочную топлива: теперь все города имеют одинаковую структуру URL. */
export const fuelLandingUrl = (citySlug: string, fuelSlug: string) =>
	`/${citySlug}/chat-voditeley/${fuelSlug}`;

/** Ссылка на страницу города. */
export const cityLandingUrl = (citySlug: string) =>
	`/${citySlug}/chat-voditeley`;

/** Ссылка на приложение-чат с предвыбранным городом и каналом. */
export const chatAppUrl = (citySlug: string, fuelSlug?: string) => {
	const params = new URLSearchParams({ city: citySlug });
	if (fuelSlug) params.set('topic', fuelSlug);
	return `/chat?${params.toString()}`;
};
