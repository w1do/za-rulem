import { getCityUrl, replaceCityPlaceholders, type ChatCity } from '../lib/cities';

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
		'Сравните цены АИ-92, АИ-95 и дизеля по сетям АЗС {ofCity}: текущая стоимость, динамика цен и история изменений.',
		city,
	),
});

export const buildGasPricesIntro = (city: ChatCity): GasPricesIntroContent => ({
	subtitle: replaceCityPlaceholders('Цены на бензин {ofCity}', city),
	title: 'Средние цены на АЗС сегодня',
	description: replaceCityPlaceholders(
		'Я отслеживаю актуальную стоимость топлива в сетях АЗС {ofCity}. Используйте сводку по брендам, чтобы быстро найти лучшую цену на АИ-92, АИ-95 или дизельное топливо.',
		city,
	),
	image: '/images/blog/azs.jpg',
	imageAlt: replaceCityPlaceholders('Цены на бензин {inCity} сегодня', city),
	features: [
		{
			icon: '/images/icon-about-body-item-1.svg',
			iconAlt: 'Анализ цен',
			title: 'Анализ цен',
			text: 'Сравните стоимость топлива в разных сетях заправок города.',
		},
		{
			icon: '/images/icon-about-body-item-2.svg',
			iconAlt: 'История и динамика',
			title: 'Динамика цен',
			text: 'Следите за изменением стоимости на основе получасовых снимков.',
		},
	],
});

export const buildGasPricesFaqs = (city: ChatCity): GasPricesFaq[] => [
	{
		question: replaceCityPlaceholders('Где самый дешевый бензин {inCity} сегодня?', city),
		answer: replaceCityPlaceholders(
			'Сравните среднюю стоимость АИ-92, АИ-95 и дизеля в карточках сетей. Данные основаны на последних опубликованных снимках из источника.',
			city,
		),
	},
	{
		question: 'Как часто обновляются данные о ценах?',
		answer:
			'Для истории каждые 30 минут сохраняется агрегированный снимок по городу и сети. В карточке бренда указана дата последнего обновления исходных данных.',
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
			'Используйте тип топлива и октановое число, указанные производителем автомобиля. Моя статистика поможет найти выгодную цену на АИ-92, АИ-95 или дизель, но не является оценкой качества топлива конкретной сети.',
			city,
		),
	},
	{
		question: replaceCityPlaceholders('Где сейчас заправиться без очереди {inCity}?', city),
		answer: replaceCityPlaceholders(
			`В блоке «Где сейчас заправиться без очереди» АЗС разложены по загруженности: без очереди, небольшая и большая очередь. Полная сводка с адресами — на странице ${getCityUrl('/ochered-na-azs', city.slug)}.`,
			city,
		),
	},
	{
		question: 'Откуда берутся данные об очередях на заправках?',
		answer:
			'Статус очереди приходит из реестра АЗС вместе с ценами и обновляется в течение дня. Заправки без свежих данных и закрытые АЗС я в карточках не показываю.',
	},
	{
		question: replaceCityPlaceholders('Как сэкономить на бензине {inCity}?', city),
		answer: replaceCityPlaceholders(
			'Сравнивайте цену на ближайших станциях с учётом расстояния, используйте доступные бонусные программы и следите за давлением в шинах. Перед поездкой проверяйте дату обновления цены.',
			city,
		),
	},
];
