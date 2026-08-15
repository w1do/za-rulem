/**
 * Прайс-лист и шкала срочности интерактивных заявок.
 * Значения используются одновременно картой, модальным окном и текстовыми блоками страниц.
 */

import type {
	AssistanceServiceId,
	QueueDurationId,
	RequestKind,
	RequestTariff,
	UrgencyLevel,
	UrgencyMeta,
} from './types.ts';

export const URGENCY_ORDER: UrgencyLevel[] = ['red', 'yellow', 'green'];

export const URGENCY_META: Record<UrgencyLevel, UrgencyMeta> = {
	red: {
		id: 'red',
		label: 'Срочно',
		hint: 'Нужна помощь прямо сейчас — заявка светится и пульсирует чаще всех.',
		markupPercent: 80,
		color: '#ef4444',
		pulseClass: 'pulse-urgent-red',
	},
	yellow: {
		id: 'yellow',
		label: 'Может подождать',
		hint: 'Готов подождать немного — метка пульсирует умеренно.',
		markupPercent: 65,
		color: '#f59e0b',
		pulseClass: 'pulse-medium-yellow',
	},
	green: {
		id: 'green',
		label: 'Не к спеху',
		hint: 'Время терпит — метка пульсирует еле заметно.',
		markupPercent: 30,
		color: '#22c55e',
		pulseClass: 'pulse-subtle-green',
	},
};

/** Тарифы «занять очередь на АЗС» по максимальному времени ожидания. */
export const QUEUE_TARIFFS: RequestTariff[] = [
	{
		id: '3',
		kind: 'queue',
		label: 'Очередь до 3 часов',
		hint: 'Постоим в очереди за вас до 3 часов.',
		basePrice: 3800,
		icon: '⛽',
	},
	{
		id: '5',
		kind: 'queue',
		label: 'Очередь до 5 часов',
		hint: 'Смена до 5 часов — для загруженных заправок.',
		basePrice: 4100,
		icon: '⛽',
	},
	{
		id: '8',
		kind: 'queue',
		label: 'Очередь до 8 часов',
		hint: 'Полная смена до 8 часов на самых длинных очередях.',
		basePrice: 4900,
		icon: '⛽',
	},
];

/** Каталог выездных услуг автопомощи. */
export const ASSISTANCE_TARIFFS: RequestTariff[] = [
	{
		id: 'tow',
		kind: 'assistance',
		label: 'Буксировка / дотащить',
		hint: 'Дотащим до сервиса, гаража или стоянки.',
		basePrice: 3500,
		icon: '🚚',
	},
	{
		id: 'battery',
		kind: 'assistance',
		label: 'Прикурить / заменить АКБ',
		hint: 'Запуск от бустера или подбор и замена аккумулятора.',
		basePrice: 3000,
		icon: '🔋',
	},
	{
		id: 'engine-repair',
		kind: 'assistance',
		label: 'Замена ГРМ / мелкий ремонт',
		hint: 'Выездной ремонт: ГРМ, ремни, датчики, проводка.',
		basePrice: 5000,
		icon: '🔧',
	},
	{
		id: 'fuel-delivery',
		kind: 'assistance',
		label: 'Подвоз топлива',
		hint: 'Привезём бензин, дизель или газ прямо на трассу.',
		basePrice: 2500,
		icon: '⛽',
	},
	{
		id: 'warmup',
		kind: 'assistance',
		label: 'Отогрев авто / запуск',
		hint: 'Отогреем двигатель и топливную систему в мороз.',
		basePrice: 4000,
		icon: '🔥',
	},
	{
		id: 'winch',
		kind: 'assistance',
		label: 'Вытащить лебёдкой',
		hint: 'Достанем из грязи, снега или кювета.',
		basePrice: 4500,
		icon: '🪝',
	},
	{
		id: 'wheel',
		kind: 'assistance',
		label: 'Замена колеса',
		hint: 'Выездной шиномонтаж и установка запаски.',
		basePrice: 2500,
		icon: '🛞',
	},
	{
		id: 'unlock',
		kind: 'assistance',
		label: 'Вскрытие авто',
		hint: 'Аккуратно откроем машину без повреждений.',
		basePrice: 3000,
		icon: '🔑',
	},
];

export const TARIFFS_BY_KIND: Record<RequestKind, RequestTariff[]> = {
	queue: QUEUE_TARIFFS,
	assistance: ASSISTANCE_TARIFFS,
};

export const QUEUE_DURATION_IDS: QueueDurationId[] = ['3', '5', '8'];

export const ASSISTANCE_SERVICE_IDS: AssistanceServiceId[] = ASSISTANCE_TARIFFS.map(
	(tariff) => tariff.id as AssistanceServiceId,
);

/** Единый вебхук приёма заявок проекта. */
export const REQUESTS_ENDPOINT = 'https://n8n.w1do.ru/webhook/requests';

/** Значение поля `project` в теле вебхука. */
export const REQUESTS_PROJECT = 'gaztochka';

/** Заявка живёт на карте 6 часов, затем считается устаревшей. */
export const REQUEST_TTL_MS = 6 * 60 * 60 * 1000;
