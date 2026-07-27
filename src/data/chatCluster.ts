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
	{ slug: 'tyumen', name: 'Тюмень', inCity: 'в Тюмени', ofCity: 'Тюмени', hint: 'Базовый город чата' },
	{ slug: 'ekaterinburg', name: 'Екатеринбург', inCity: 'в Екатеринбурге', ofCity: 'Екатеринбурга', hint: 'АЗС и трассы Свердловской области' },
	{ slug: 'chelyabinsk', name: 'Челябинск', inCity: 'в Челябинске', ofCity: 'Челябинска', hint: 'Город и трасса М-5' },
	{ slug: 'surgut', name: 'Сургут', inCity: 'в Сургуте', ofCity: 'Сургута', hint: 'ХМАО: город и зимники' },
	{ slug: 'nizhnevartovsk', name: 'Нижневартовск', inCity: 'в Нижневартовске', ofCity: 'Нижневартовска', hint: 'Восток ХМАО' },
	{ slug: 'tobolsk', name: 'Тобольск', inCity: 'в Тобольске', ofCity: 'Тобольска', hint: 'Север Тюменской области' },
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
	`/chat-voditeley/${citySlug}/${fuelSlug}`;

/** Ссылка на страницу города. */
export const cityLandingUrl = (citySlug: string) =>
	`/chat-voditeley/${citySlug}`;

/** Ссылка на приложение-чат с предвыбранным городом и каналом. */
export const chatAppUrl = (citySlug: string, fuelSlug?: string) => {
	const params = new URLSearchParams({ city: citySlug });
	if (fuelSlug) params.set('topic', fuelSlug);
	return `/chat?${params.toString()}`;
};
