import { replaceCityPlaceholders, type ChatCity } from '../lib/cities';

/**
 * Тексты страницы «Цены на бензин»: метаданные, интро и FAQ.
 * Компонент страницы отвечает только за композицию, тексты живут здесь.
 */

export interface GasPricesMeta {
	title: string;
	h1: string;
	description: string;
}

export interface GasPricesFaq {
	question: string;
	answer: string;
}

export interface GasPricesIntroContent {
	subtitle: string;
	title: string;
	description: string;
	image: string;
	imageAlt: string;
	features: {
		icon: string;
		iconAlt: string;
		title: string;
		text: string;
	}[];
}

export const buildGasPricesMeta = (city: ChatCity): GasPricesMeta => ({
	title: replaceCityPlaceholders('Цены на АЗС {inCity} сегодня — АИ-92, АИ-95 и ДТ', city),
	h1: replaceCityPlaceholders('Цены на АЗС {inCity} сегодня', city),
	description: replaceCityPlaceholders(
		'Сравните цены АИ-92, АИ-95 и дизеля по сетям АЗС {ofCity}: текущая стоимость, изменение к прошлому снимку, адреса и карта заправок.',
		city,
	),
});

export const buildGasPricesIntro = (city: ChatCity): GasPricesIntroContent => ({
	subtitle: replaceCityPlaceholders('Карта заправок {ofCity}', city),
	title: 'Бензин по наличию на АЗС',
	description: replaceCityPlaceholders(
		'Я отслеживаю актуальное наличие топлива и цены на заправках {ofCity}. Используйте поиск и список слева, чтобы быстро найти нужную марку бензина (АИ-92, АИ-95) или дизельное топливо. Карта поможет проложить маршрут до ближайшей работающей станции.',
		city,
	),
	image: '/images/blog/azs.jpg',
	imageAlt: replaceCityPlaceholders('Карта заправок и цены на бензин {inCity}', city),
	features: [
		{
			icon: '/images/icon-about-body-item-1.svg',
			iconAlt: 'Поиск АЗС',
			title: 'Быстрый поиск',
			text: 'Выберите нужное топливо и найдите ближайшую работающую АЗС.',
		},
		{
			icon: '/images/icon-about-body-item-2.svg',
			iconAlt: 'Цены и наличие топлива',
			title: 'Цены и наличие',
			text: 'Сравните стоимость топлива, статус станции и информацию об очереди.',
		},
	],
});

export const buildGasPricesFaqs = (city: ChatCity): GasPricesFaq[] => [
	{
		question: replaceCityPlaceholders('Где самый дешевый бензин {inCity} сегодня?', city),
		answer: replaceCityPlaceholders(
			'Сравните среднюю стоимость АИ-92, АИ-95 и дизеля в карточках сетей, затем откройте сеть и проверьте цены конкретных станций на карте. Данные зависят от публикации цен источником.',
			city,
		),
	},
	{
		question: 'Как часто обновляются данные о ценах?',
		answer:
			'Текущие цены загружаются из публичного источника 2GIS, а для истории каждые 30 минут сохраняется агрегированный снимок по городу и сети. В карточке указана дата обновления исходных цен.',
	},
	{
		question: 'Что делать, если закончился бензин посреди дороги?',
		answer: replaceCityPlaceholders(
			'Если топливо закончилось в дороге, оставьте заявку на подвоз бензина или дизельного топлива. Время и возможность выезда подтвердит специалист после получения адреса.',
			city,
		),
	},
	{
		question: replaceCityPlaceholders('Какое топливо лучше заправлять {inCity}?', city),
		answer: replaceCityPlaceholders(
			'Используйте тип топлива и октановое число, указанные производителем автомобиля. Карта поможет найти АИ-92, АИ-95 или дизель, но не является оценкой качества топлива конкретной сети.',
			city,
		),
	},
	{
		question: replaceCityPlaceholders('Как сэкономить на бензине {inCity}?', city),
		answer: replaceCityPlaceholders(
			'Сравнивайте цену на ближайших станциях с учётом расстояния, используйте доступные бонусные программы и следите за давлением в шинах. Перед поездкой проверяйте дату обновления цены.',
			city,
		),
	},
];
