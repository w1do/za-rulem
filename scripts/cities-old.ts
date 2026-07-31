export interface ChatCity {
	/** Слаг в URL и в поле city сообщений чата. */
	slug: string;
	/** Название города в именительном падеже. */
	name: string;
	/** «в Тюмени», «в Екатеринбурге» — предложный падеж с предлогом. */
	inCity: string;
	/** «Тюмени», «Екатеринбурга» — родительный падеж. */
	ofCity: string;
	/** «по Тюмени», «по Екатеринбургу» — дательный падеж с предлогом. */
	byCity: string;
	/** «для Тюмени», «для Екатеринбурга» — родительный падеж с предлогом. */
	forCity: string;
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

/** Базовый город кластера: его посадочные живут на /chat-voditeley/{fuel}. */
export const DEFAULT_CITY_SLUG = 'tyumen';

export const chatCities: ChatCity[] = [
	{
		slug: 'tyumen',
		name: 'Тюмень',
		inCity: 'в Тюмени',
		ofCity: 'Тюмени',
		byCity: 'по Тюмени',
		forCity: 'для Тюмени',
		hint: 'Базовый город чата',
		bounds: { minLat: 57.0, maxLat: 57.3, minLon: 65.2, maxLon: 65.9 },
	},
	{
		slug: 'ekaterinburg',
		name: 'Екатеринбург',
		inCity: 'в Екатеринбурге',
		ofCity: 'Екатеринбурга',
		byCity: 'по Екатеринбургу',
		forCity: 'для Екатеринбурга',
		hint: 'АЗС и трассы Свердловской области',
		bounds: { minLat: 56.68, maxLat: 56.98, minLon: 60.25, maxLon: 60.95 },
	},
	{
		slug: 'moscow',
		name: 'Москва',
		inCity: 'в Москве',
		ofCity: 'Москвы',
		byCity: 'по Москве',
		forCity: 'для Москвы',
		hint: 'Столица России',
		bounds: { minLat: 55.57, maxLat: 55.91, minLon: 37.36, maxLon: 37.86 },
	},
	{
		slug: 'saint-petersburg',
		name: 'Санкт-Петербург',
		inCity: 'в Санкт-Петербурге',
		ofCity: 'Санкт-Петербурга',
		byCity: 'по Санкт-Петербургу',
		forCity: 'для Санкт-Петербурга',
		hint: 'Северная столица',
		bounds: { minLat: 59.74, maxLat: 60.09, minLon: 30.04, maxLon: 30.56 },
	},
	{
		slug: 'chelyabinsk',
		name: 'Челябинск',
		inCity: 'в Челябинске',
		ofCity: 'Челябинска',
		byCity: 'по Челябинску',
		forCity: 'для Челябинска',
		hint: 'Город и трасса М-5',
		bounds: { minLat: 55.01, maxLat: 55.31, minLon: 61.09, maxLon: 61.79 },
	},
	{
		slug: 'surgut',
		name: 'Сургут',
		inCity: 'в Сургуте',
		ofCity: 'Сургута',
		byCity: 'по Сургуту',
		forCity: 'для Сургута',
		hint: 'ХМАО: город и зимники',
		bounds: { minLat: 61.10, maxLat: 61.40, minLon: 73.05, maxLon: 73.75 },
	},
	{
		slug: 'nizhnevartovsk',
		name: 'Нижневартовск',
		inCity: 'в Нижневартовске',
		ofCity: 'Нижневартовска',
		byCity: 'по Нижневартовску',
		forCity: 'для Нижневартовска',
		hint: 'Восток ХМАО',
		bounds: { minLat: 60.80, maxLat: 61.10, minLon: 76.25, maxLon: 76.95 },
	},
	{
		slug: 'tobolsk',
		name: 'Тобольск',
		inCity: 'в Тобольске',
		ofCity: 'Тобольска',
		byCity: 'по Тобольску',
		forCity: 'для Тобольска',
		hint: 'Север Тюменской области',
		bounds: { minLat: 58.05, maxLat: 58.35, minLon: 67.90, maxLon: 68.60 },
	},
	{
		slug: 'novosibirsk',
		name: 'Новосибирск',
		inCity: 'в Новосибирске',
		ofCity: 'Новосибирска',
		byCity: 'по Новосибирске',
		forCity: 'для Новосибирска',
		hint: 'Столица Сибири',
	},
	{
		slug: 'kazan',
		name: 'Казань',
		inCity: 'в Казани',
		ofCity: 'Казани',
		byCity: 'по Казани',
		forCity: 'для Казани',
		hint: 'Столица Татарстана',
	},
	{
		slug: 'nizhny-novgorod',
		name: 'Нижний Новгород',
		inCity: 'в Нижнем Новгороде',
		ofCity: 'Нижнего Новгорода',
		byCity: 'по Нижнему Новгороду',
		forCity: 'для Нижнего Новгорода',
		hint: 'Город на Волге и Оке',
	},
	{
		slug: 'samara',
		name: 'Самара',
		inCity: 'в Самаре',
		ofCity: 'Самары',
		byCity: 'по Самаре',
		forCity: 'для Самары',
		hint: 'Город на Волге',
	},
	{
		slug: 'omsk',
		name: 'Омск',
		inCity: 'в Омске',
		ofCity: 'Омска',
		byCity: 'по Омску',
		forCity: 'для Омска',
		hint: 'Западная Сибирь',
	},
	{
		slug: 'rostov-on-don',
		name: 'Ростов-на-Дону',
		inCity: 'в Ростове-на-Дону',
		ofCity: 'Ростова-на-Дону',
		byCity: 'по Ростову-на-Дону',
		forCity: 'для Ростова-на-Дону',
		hint: 'Южная столица',
	},
	{
		slug: 'ufa',
		name: 'Уфа',
		inCity: 'в Уфе',
		ofCity: 'Уфы',
		byCity: 'по Уфе',
		forCity: 'для Уфы',
		hint: 'Столица Башкортостана',
	},
	{
		slug: 'krasnoyarsk',
		name: 'Красноярск',
		inCity: 'в Красноярске',
		ofCity: 'Красноярска',
		byCity: 'по Красноярску',
		forCity: 'для Красноярска',
		hint: 'Восточная Сибирь',
	},
	{
		slug: 'perm',
		name: 'Пермь',
		inCity: 'в Перми',
		ofCity: 'Перми',
		byCity: 'по Перми',
		forCity: 'для Перми',
		hint: 'Прикамье',
	},
	{
		slug: 'voronezh',
		name: 'Воронеж',
		inCity: 'в Воронеже',
		ofCity: 'Воронежа',
		byCity: 'по Воронежу',
		forCity: 'для Воронежа',
		hint: 'Черноземье',
	},
	{
		slug: 'volgograd',
		name: 'Волгоград',
		inCity: 'в Волгограде',
		ofCity: 'Волгограда',
		byCity: 'по Волгограду',
		forCity: 'для Волгограда',
		hint: 'Город-герой на Волге',
	},
	{
		slug: 'krasnodar',
		name: 'Краснодар',
		inCity: 'в Краснодаре',
		ofCity: 'Краснодара',
		byCity: 'по Краснодару',
		forCity: 'для Краснодара',
		hint: 'Столица Кубани',
	},
	{
		slug: 'saratov',
		name: 'Саратов',
		inCity: 'в Саратове',
		ofCity: 'Саратова',
		byCity: 'по Саратову',
		forCity: 'для Саратова',
		hint: 'Нижнее Поволжье',
	},
	{
		slug: 'tolyatti',
		name: 'Тольятти',
		inCity: 'в Тольятти',
		ofCity: 'Тольятти',
		byCity: 'по Тольятти',
		forCity: 'для Тольятти',
		hint: 'Автомобильная столица',
	},
	{
		slug: 'izhevsk',
		name: 'Ижевск',
		inCity: 'в Ижевске',
		ofCity: 'Ижевска',
		byCity: 'по Ижевску',
		forCity: 'для Ижевска',
		hint: 'Оружейная столица',
	},
	{
		slug: 'barnaul',
		name: 'Барнаул',
		inCity: 'в Барнауле',
		ofCity: 'Барнаула',
		byCity: 'по Барнаулу',
		forCity: 'для Барнаула',
		hint: 'Алтайский край',
	},
	{
		slug: 'irkutsk',
		name: 'Иркутск',
		inCity: 'в Иркутке',
		ofCity: 'Иркутска',
		byCity: 'по Иркутску',
		forCity: 'для Иркутска',
		hint: 'Рядом с Байкалом',
	},
	{
		slug: 'ulyanovsk',
		name: 'Ульяновск',
		inCity: 'в Ульяновске',
		ofCity: 'Ульяновска',
		byCity: 'по Ульяновску',
		forCity: 'для Ульяновска',
		hint: 'Родина Ленина',
	},
	{
		slug: 'khabarovsk',
		name: 'Хабаровск',
		inCity: 'в Хабаровске',
		ofCity: 'Хабаровска',
		byCity: 'по Хабаровску',
		forCity: 'для Хабаровска',
		hint: 'Дальний Восток',
	},
	{
		slug: 'vladivostok',
		name: 'Владивосток',
		inCity: 'в Владивостоке',
		ofCity: 'Владивостока',
		byCity: 'по Владивостоку',
		forCity: 'для Владивостока',
		hint: 'Тихоокеанское побережье',
	},
	{
		slug: 'yaroslavl',
		name: 'Ярославль',
		inCity: 'в Ярославле',
		ofCity: 'Ярославля',
		byCity: 'по Ярославлю',
		forCity: 'для Ярославля',
		hint: 'Золотое кольцо',
	},
	{
		slug: 'tomsk',
		name: 'Томск',
		inCity: 'в Томске',
		ofCity: 'Томска',
		byCity: 'по Томску',
		forCity: 'для Томска',
		hint: 'Студенческий город',
	},
	{
		slug: 'orenburg',
		name: 'Оренбург',
		inCity: 'в Оренбурге',
		ofCity: 'Оренбурга',
		byCity: 'по Оренбургу',
		forCity: 'для Оренбурга',
		hint: 'Граница Европы и Азии',
	},
	{
		slug: 'kemerovo',
		name: 'Кемерово',
		inCity: 'в Кемерово',
		ofCity: 'Кемерово',
		byCity: 'по Кемерово',
		forCity: 'для Кемерово',
		hint: 'Кузбасс',
	},
	{
		slug: 'ryazan',
		name: 'Рязань',
		inCity: 'в Рязани',
		ofCity: 'Рязани',
		byCity: 'по Рязани',
		forCity: 'для Рязани',
		hint: 'Рядом с Москвой',
	},
	{
		slug: 'astrakhan',
		name: 'Астрахань',
		inCity: 'в Астрахани',
		ofCity: 'Астрахани',
		byCity: 'по Астрахани',
		forCity: 'для Астрахани',
		hint: 'Каспийская столица',
	},
	{
		slug: 'penza',
		name: 'Пенза',
		inCity: 'в Пензе',
		ofCity: 'Пензы',
		byCity: 'по Пензе',
		forCity: 'для Пензы',
		hint: 'Сурский край',
	},
	{
		slug: 'lipetsk',
		name: 'Липецк',
		inCity: 'в Липецке',
		ofCity: 'Липецка',
		byCity: 'по Липецку',
		forCity: 'для Липецка',
		hint: 'Черноземье',
	},
];

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
