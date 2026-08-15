/**
 * Приведение станций Directus (`stations` + `gas_daily`) к минимальному срезу для карты заявок.
 * Клиенту отдаём только координаты, подпись и уровень очереди — цены и услуги здесь не нужны.
 */

import type { StationData } from '../../../lib/gasStations.ts';
import type { MapStation } from './types.ts';

export const toMapStations = (stations: StationData[]): MapStation[] =>
	stations
		.filter((item) => Number.isFinite(Number(item.station?.lat)) && Number.isFinite(Number(item.station?.lng)))
		.map((item) => ({
			id: String(item.station.id),
			name: item.station.name,
			brand: item.station.brand,
			address: item.station.address,
			lat: Number(item.station.lat),
			lng: Number(item.station.lng),
			queueLevel: item.queue_level ?? '',
			closed: Boolean(item.closed),
		}));
