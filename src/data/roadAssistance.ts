export const ROAD_SITUATION_IDS = [
	'stalled',
	'towing',
	'fuel',
	'battery',
	'wheel',
	'ditch',
	'accident',
	'other',
] as const;

export type RoadSituationId = (typeof ROAD_SITUATION_IDS)[number];

export type RoadSituation = {
	id: RoadSituationId;
	title: string;
	description: string;
	icon: string;
};

export const roadSituations: Readonly<Record<RoadSituationId, RoadSituation>> = {
	stalled: {
		id: 'stalled',
		title: 'Машина заглохла',
		description: 'Диспетчер уточнит симптомы и подберёт выездную диагностику или безопасную эвакуацию.',
		icon: '/images/icon-service-1.svg',
	},
	towing: {
		id: 'towing',
		title: 'Нужен эвакуатор',
		description: 'Подберём подходящую технику с учётом типа автомобиля, состояния колёс и места остановки.',
		icon: '/images/icon-service-5.svg',
	},
	fuel: {
		id: 'fuel',
		title: 'Закончилось топливо',
		description: 'Передадим партнёру марку топлива, нужный объём и точный ориентир на трассе.',
		icon: '/images/icon-service-4.svg',
	},
	battery: {
		id: 'battery',
		title: 'Сел аккумулятор',
		description: 'Можно запросить запуск двигателя, проверку контактов или замену аккумулятора на месте.',
		icon: '/images/icon-service-2.svg',
	},
	wheel: {
		id: 'wheel',
		title: 'Пробито колесо',
		description: 'Сообщите, есть ли запаска и можно ли безопасно подойти к повреждённой стороне автомобиля.',
		icon: '/images/icon-service-3.svg',
	},
	ditch: {
		id: 'ditch',
		title: 'Машина застряла или съехала',
		description: 'Для подбора тягача нужны масса автомобиля, состояние грунта и положение машины относительно дороги.',
		icon: '/images/icon-service-6.svg',
	},
	accident: {
		id: 'accident',
		title: 'ДТП или опасная остановка',
		description: 'Если есть пострадавшие, огонь, утечка топлива или угроза движению, сначала звоните 112.',
		icon: '/images/icon-service-feature-1.svg',
	},
	other: {
		id: 'other',
		title: 'Другая проблема',
		description: 'Опишите ситуацию своими словами — оператор уточнит детали и предложит следующий шаг.',
		icon: '/images/icon-service-feature-2.svg',
	},
};

export const isRoadSituationId = (value: unknown): value is RoadSituationId =>
	typeof value === 'string' && ROAD_SITUATION_IDS.some((id) => id === value);
