import type { StationData, FuelStatus, FuelPrice } from '../../../lib/gasStations';

/**
 * DTO коллекции `stations` в Directus.
 * Поля соответствуют directus/collections/stations.collection.json
 */
export interface DirectusStation {
	id: string;
	status?: string;
	name: string;
	brand?: string;
	address?: string;
	lat?: number;
	lng?: number;
	fuel_assortment?: string[] | string;
	fuel_statuses?: FuelStatus[] | string;
	prices?: FuelPrice[] | string;
	last_transaction_at?: string;
	closed?: boolean;
	queue_level?: string;
}

/** DTO снимка цен `gas_daily` с `area_type=point` (цены конкретной АЗС). */
export interface DirectusStationPriceSnapshot {
	station?: string | { id?: string } | null;
	area_slug?: string;
	area_parent_slug?: string;
	brand_slug?: string;
	snapshot_date?: string;
	source_updated_at?: string;
	fuel_prices?: unknown;
}

/** Готовые цены одной АЗС из `gas_daily`. */
export interface StationPricesSnapshot {
	stationId: string;
	snapshotDate: string;
	brandSlug: string;
	prices: FuelPrice[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const parseJsonField = <T>(value: unknown, fallback: T): T => {
	if (typeof value !== 'string') return (value as T) ?? fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
};

const toCoordinate = (value: unknown): number => {
	const coordinate = Number(value);
	return Number.isFinite(coordinate) ? coordinate : 0;
};


export const toStationData = (item: DirectusStation): StationData => {
	const assortment = parseJsonField<string[]>(item.fuel_assortment, []);
	const statuses = parseJsonField<FuelStatus[]>(item.fuel_statuses, []);
	const prices = parseJsonField<FuelPrice[]>(item.prices, []);

	return {
		station: {
			id: item.id,
			region_id: 0, // Не хранится в едином реестре
			name: item.name,
			brand: item.brand || '',
			address: item.address || '',
			lat: toCoordinate(item.lat),
			lng: toCoordinate(item.lng),
			last_transaction_at: item.last_transaction_at || new Date().toISOString(),
			fuel_assortment: Array.isArray(assortment) ? assortment : [],
			has_shop: false, // Опциональные поля 2GIS в реестре не хранятся
			has_cafe: false,
			has_toilet: false,
			has_car_wash: false,
			pay_card: false,
			pay_cash: false,
			pay_sbp: false,
		},
		fuel_statuses: Array.isArray(statuses) ? statuses : [],
		prices: Array.isArray(prices) ? prices : [],
		status: item.closed ? 'closed' : 'open',
		closed: item.closed || false,
		queue_level: item.queue_level || 'none',
	};
};

/**
 * Запасная карточка АЗС из снимка цен: используется, когда реестр `stations`
 * не ответил или не содержит записи. Цены важнее оформления карточки.
 */
export const toStationDataFromSnapshot = (snapshot: StationPricesSnapshot): StationData => ({
	station: {
		id: snapshot.stationId,
		region_id: 0,
		name: snapshot.brandSlug || 'АЗС',
		brand: snapshot.brandSlug,
		address: '',
		lat: 0,
		lng: 0,
		last_transaction_at: snapshot.snapshotDate,
		fuel_assortment: snapshot.prices.map((price) => price.fuel_type),
		has_shop: false,
		has_cafe: false,
		has_toilet: false,
		has_car_wash: false,
		pay_card: false,
		pay_cash: false,
		pay_sbp: false,
	},
	fuel_statuses: [],
	prices: snapshot.prices,
	status: 'open',
	closed: false,
	queue_level: 'none',
});

const readPriceUpdatedAt = (item: Record<string, unknown>): string => {
	const updatedAt = item.updatedAt ?? item.updated_at;
	return typeof updatedAt === 'string' ? updatedAt : '';
};

const readStationId = (value: DirectusStationPriceSnapshot): string => {
	if (typeof value.station === 'string') return value.station;
	if (isRecord(value.station) && typeof value.station.id === 'string') return value.station.id;
	return typeof value.area_slug === 'string' ? value.area_slug : '';
};

/**
 * Переводит снимок `gas_daily` в список цен станции.
 * Парсер пишет агрегаты в camelCase (`fuelType`, `average`, `updatedAt`);
 * snake_case поддерживается для более старых записей.
 */
export const toStationPricesSnapshot = (value: unknown): StationPricesSnapshot | null => {
	if (!isRecord(value)) return null;
	const snapshot = value as DirectusStationPriceSnapshot;
	const stationId = readStationId(snapshot);
	const snapshotDate = typeof snapshot.snapshot_date === 'string' ? snapshot.snapshot_date : '';
	if (!stationId || !snapshotDate) return null;

	const rawPrices = parseJsonField<unknown[]>(snapshot.fuel_prices, []);
	if (!Array.isArray(rawPrices)) return null;

	const prices = rawPrices
		.map((item): FuelPrice | null => {
			if (!isRecord(item)) return null;
			const rawFuelType = item.fuelType ?? item.fuel_type;
			const fuelType = typeof rawFuelType === 'string' ? rawFuelType : '';
			const price = Number(item.price ?? item.average);
			if (!fuelType || !Number.isFinite(price) || price <= 0) return null;
			return {
				station_id: stationId,
				fuel_type: fuelType,
				price,
				updated_at: readPriceUpdatedAt(item) || snapshot.source_updated_at || snapshotDate,
			};
		})
		.filter((price): price is FuelPrice => price !== null);

	if (prices.length === 0) return null;
	return {
		stationId,
		snapshotDate,
		brandSlug: typeof snapshot.brand_slug === 'string' ? snapshot.brand_slug : '',
		prices,
	};
};

export const readDataItems = (payload: unknown): unknown[] =>
	isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

export const isDirectusStation = (value: unknown): value is DirectusStation =>
	isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
