import type { ChatCity } from './cities';
import { replaceCityPlaceholders } from '../lib/city';

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
	title: replaceCityPlaceholders('Цены на бензин {inCity} сегодня | Где бензин | Карта АЗС', city),
	h1: replaceCityPlaceholders('Цены на бензин {inCity} сегодня: где заправиться дешевле?', city),
	description: replaceCityPlaceholders(
		'Актуальные цены на бензин АИ-92, АИ-95 и ДТ {inCity} на сегодня. Смотрите карту заправок с ценами и экономьте на топливе.',
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
			'Цены на топливо постоянно меняются. На нашей интерактивной карте вы можете в реальном времени сравнить стоимость АИ-92, АИ-95 и дизеля на всех популярных АЗС {ofCity}, включая Газпромнефть, Лукойл, Роснефть и другие.',
			city,
		),
	},
	{
		question: 'Как часто обновляются данные о ценах?',
		answer:
			'Информация на карте обновляется ежедневно на основе данных от поставщиков и отзывов пользователей. Мы стараемся предоставлять самые свежие сведения, чтобы вы могли сэкономить на каждой заправке.',
	},
	{
		question: 'Что делать, если закончился бензин посреди дороги?',
		answer: replaceCityPlaceholders(
			'Если вы не рассчитали запас топлива и заглохли, я готов прийти на помощь. Я осуществляю подвоз бензина или дизельного топлива в любую точку {ofCity} и области. Просто оставьте заявку на сайте, и я приеду к вам в течение 15-30 минут.',
			city,
		),
	},
	{
		question: replaceCityPlaceholders('Какое топливо лучше заправлять {inCity}?', city),
		answer: replaceCityPlaceholders(
			'Я рекомендую придерживаться рекомендаций производителя вашего автомобиля. {inCity} представлены все крупные федеральные сети (Газпромнефть, Лукойл, Роснефть), и качество топлива на них, как правило, высокое. Моя карта поможет вам найти АИ-95, АИ-92 или дизель с актуальным ценником.',
			city,
		),
	},
	{
		question: replaceCityPlaceholders('Как сэкономить на бензине {inCity}?', city),
		answer: replaceCityPlaceholders(
			"Помимо мониторинга цен на моей карте, используйте бонусные программы сетей АЗС. Также следите за давлением в шинах и исправностью двигателя — это снижает расход. А планирование заправок через мой сервис позволит вам избежать переплат на 'дорогих' станциях города.",
			city,
		),
	},
];
