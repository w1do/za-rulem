import { getCityUrl, replaceCityPlaceholders, type ChatCity } from '../lib/cities';

/**
 * Тексты страницы «Очереди на АЗС»: метаданные, интро и FAQ.
 * Страница отвечает только за композицию, тексты живут здесь.
 */

export interface GasQueuesMeta {
	title: string;
	h1: string;
	description: string;
}

export interface GasQueuesFaq {
	question: string;
	answer: string;
}

export const buildGasQueuesMeta = (city: ChatCity): GasQueuesMeta => ({
	title: replaceCityPlaceholders('Очереди на АЗС {inCity} сейчас — где заправиться без очереди', city),
	h1: replaceCityPlaceholders('Очереди на АЗС {inCity} сейчас', city),
	description: replaceCityPlaceholders(
		'Смотрите, на каких заправках {ofCity} сейчас нет очереди, где она небольшая, а какие АЗС лучше объехать. Адреса, цены и время обновления данных.',
		city,
	),
});

export const buildGasQueuesIntro = (city: ChatCity): string =>
	replaceCityPlaceholders(
		'Я собираю статусы очередей с заправок {ofCity} вместе с ценами на топливо и раскладываю АЗС по загруженности. Заправки без свежих данных и закрытые станции в подборку не попадают: лучше показать меньше, чем ввести в заблуждение.',
		city,
	);

export const buildGasQueuesFaqs = (city: ChatCity): GasQueuesFaq[] => [
	{
		question: replaceCityPlaceholders('Как узнать, где нет очереди на АЗС {inCity}?', city),
		answer:
			'Откройте группу «Без очереди» — в ней собраны заправки, по которым последний отчёт показал отсутствие очереди. В карточке есть адрес, цены и время обновления данных.',
	},
	{
		question: 'Насколько свежие данные об очередях?',
		answer:
			'Статусы приходят из реестра АЗС вместе с ценами и обновляются в течение дня. Данные старше суток я не показываю, а точное время последнего обновления указано в карточке заправки.',
	},
	{
		question: 'Что делать, если очередь есть на всех ближайших заправках?',
		answer: replaceCityPlaceholders(
			`Можно попросить водителя занять очередь заранее на странице ${getCityUrl('/queue', city.slug)} или уточнить обстановку у водителей в чате города.`,
			city,
		),
	},
	{
		question: replaceCityPlaceholders('Где посмотреть цены на бензин {inCity}?', city),
		answer: replaceCityPlaceholders(
			`Сводка средних цен по сетям АЗС — на странице ${getCityUrl('/ceny-na-benzin', city.slug)}. Там же показана карта заправок и динамика цен.`,
			city,
		),
	},
];
