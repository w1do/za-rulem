/**
 * Аналитика очередей на АЗС города по снимкам `gas_daily`.
 * Чистые функции: считают текущую обстановку на заправках и подбирают,
 * где спокойно, где стоят дольше всего и в какие часы выгоднее занимать очередь.
 */

import { resolveQueueBucket } from '../../gas-queues/model/queueLevels.ts';
import type { MapStation } from './types.ts';

export interface QueueStationHint {
	id: string;
	name: string;
	address: string;
	brand: string;
}

export type QueueLoadTone = 'calm' | 'moderate' | 'busy';

export interface QueueTimeWindow {
	id: string;
	/** Начало окна, час местного времени (включительно). */
	fromHour: number;
	/** Конец окна, час местного времени (не включая). */
	toHour: number;
	label: string;
	tone: QueueLoadTone;
	advice: string;
}

export interface QueueAnalytics {
	/** Сколько АЗС попало в снимок и по ним считалась статистика. */
	total: number;
	free: number;
	small: number;
	large: number;
	closed: number;
	unknown: number;
	/** Доля загруженных АЗС (большая очередь) в процентах, 0 при отсутствии данных. */
	busyShare: number;
	tone: QueueLoadTone;
	/** Короткий вывод: стоит ли ехать самому или лучше заказать место в очереди. */
	verdict: string;
	calmStations: QueueStationHint[];
	busyStations: QueueStationHint[];
	windows: QueueTimeWindow[];
}

/**
 * Типовой суточный ритм заправок: используется как справочная подсказка,
 * потому что снимок `gas_daily` показывает только текущее состояние очередей.
 */
export const QUEUE_TIME_WINDOWS: QueueTimeWindow[] = [
	{
		id: 'night',
		fromHour: 0,
		toHour: 6,
		label: '00:00 — 06:00',
		tone: 'calm',
		advice: 'Ночью очередей почти нет, но работают не все АЗС — проверьте статус на карте.',
	},
	{
		id: 'morning-peak',
		fromHour: 6,
		toHour: 10,
		label: '06:00 — 10:00',
		tone: 'busy',
		advice: 'Утренний пик: все едут на работу. Занимать очередь выгоднее заранее, с вечера или к 6 утра.',
	},
	{
		id: 'midday',
		fromHour: 10,
		toHour: 13,
		label: '10:00 — 13:00',
		tone: 'calm',
		advice: 'Самое спокойное дневное окно: можно заправиться самому без подмены.',
	},
	{
		id: 'afternoon',
		fromHour: 13,
		toHour: 16,
		label: '13:00 — 16:00',
		tone: 'moderate',
		advice: 'Подвозят топливо и подтягиваются коммерческие машины — очередь средняя.',
	},
	{
		id: 'evening-peak',
		fromHour: 16,
		toHour: 20,
		label: '16:00 — 20:00',
		tone: 'busy',
		advice: 'Вечерний пик и самое дорогое время ожидания: заявку лучше подать за 1–2 часа.',
	},
	{
		id: 'late-evening',
		fromHour: 20,
		toHour: 24,
		label: '20:00 — 24:00',
		tone: 'calm',
		advice: 'Поток спадает: удобное время, чтобы встать в очередь на утренний завоз.',
	},
];

const takeStations = (stations: MapStation[], limit: number): QueueStationHint[] =>
	stations.slice(0, limit).map((station) => ({
		id: station.id,
		name: station.name,
		address: station.address,
		brand: station.brand,
	}));

/** Считает сводку по станциям города для блока аналитики очередей. */
export const buildQueueAnalytics = (stations: MapStation[]): QueueAnalytics => {
	const free: MapStation[] = [];
	const small: MapStation[] = [];
	const large: MapStation[] = [];
	let closed = 0;
	let unknown = 0;

	for (const station of stations) {
		if (station.closed) {
			closed += 1;
			continue;
		}

		const bucket = resolveQueueBucket(station.queueLevel, station.closed);
		if (bucket === 'free') free.push(station);
		else if (bucket === 'small') small.push(station);
		else if (bucket === 'large') large.push(station);
		else unknown += 1;
	}

	const known = free.length + small.length + large.length;
	const busyShare = known === 0 ? 0 : Math.round((large.length / known) * 100);

	const tone: QueueLoadTone = busyShare >= 40 ? 'busy' : busyShare >= 15 ? 'moderate' : 'calm';
	const verdict =
		known === 0
			? 'Свежих данных по очередям пока нет — ориентируйтесь на пины АЗС на карте и типовые часы пик.'
			: tone === 'busy'
				? `Сейчас загружено ${busyShare}% заправок: ехать самому долго, выгоднее заказать место в очереди.`
				: tone === 'moderate'
					? `Загружено ${busyShare}% заправок: на популярных АЗС стоит подстраховаться заявкой.`
					: 'Обстановка спокойная: на большинстве АЗС очереди нет, место можно занять недорого.';

	return {
		total: stations.length,
		free: free.length,
		small: small.length,
		large: large.length,
		closed,
		unknown,
		busyShare,
		tone,
		verdict,
		calmStations: takeStations(free.length > 0 ? free : small, 3),
		busyStations: takeStations(large.length > 0 ? large : small, 3),
		windows: QUEUE_TIME_WINDOWS,
	};
};
