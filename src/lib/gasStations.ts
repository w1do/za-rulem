/**
 * Данные и правила по АЗС: загрузка станций из 2GIS, фильтрация и разбор статусов.
 * Модуль не зависит от UI и используется и на сервере (Astro), и в клиентской карте.
 */

export interface FuelPrice {
	station_id: string;
	fuel_type: string;
	price: number;
	updated_at: string;
}

export interface FuelStatus {
	station_id: string;
	fuel_type: string;
	available: boolean | null;
	queue_level: string;
	limit_liters?: number;
	reports_count?: number;
	last_report_at?: string;
}

export interface StationData {
	station: {
		id: string;
		region_id: number;
		name: string;
		brand: string;
		address: string;
		lat: number;
		lng: number;
		last_transaction_at: string;
		has_shop: boolean;
		has_cafe: boolean;
		has_toilet: boolean;
		has_car_wash: boolean;
		pay_card: boolean;
		pay_cash: boolean;
		pay_sbp: boolean;
		fuel_assortment: string[];
	};
	fuel_statuses: FuelStatus[];
	prices: FuelPrice[];
	status: string;
	closed: boolean;
	queue_level: string;
	can_use_canister?: boolean;
}

/** Прямоугольник координат города, по которому запрашиваются АЗС. */
export interface MapBounds {
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}

export type QueueFilter = 'ALL' | 'SMALL' | 'LARGE';

export interface StationFilters {
	searchQuery: string;
	fuelTypes: string[];
	fuelLimit: number | null;
	onlyCanister: boolean;
	queue: QueueFilter;
}

const STATIONS_API_URL = 'https://benzin.api.2gis.ru/api/v1/stations';
const STATIONS_REQUEST_TIMEOUT_MS = 8000;

/** Данные станции считаются устаревшими и не показываются через сутки. */
export const MAX_STATION_AGE_MS = 24 * 60 * 60 * 1000;

export const FUEL_LIMIT_OPTIONS = [10, 20, 30, 40] as const;

export const FUEL_FILTER_TYPES = ['AI_92', 'AI_95', 'DT', 'GAS'] as const;

const SMALL_QUEUE_LEVELS = ['NONE', 'UP_TO_25', 'FROM_10_TO_25'];
const LARGE_QUEUE_LEVELS = ['FROM_25_TO_50', 'OVER_50'];

export const buildStationsUrl = (bounds: MapBounds): string => {
	const { minLat, maxLat, minLon, maxLon } = bounds;
	return `${STATIONS_API_URL}?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}`;
};

/**
 * Загружает станции по границам города.
 * Ошибка сети или неуспешный ответ не ломают страницу: возвращается пустой список.
 */
export const fetchGasStations = async (bounds: MapBounds): Promise<StationData[]> => {
	try {
		const response = await fetch(buildStationsUrl(bounds), {
			signal: AbortSignal.timeout(STATIONS_REQUEST_TIMEOUT_MS),
		});
		if (!response.ok) {
			console.error(`2GIS stations request failed with status ${response.status}`);
			return [];
		}
		const data: unknown = await response.json();
		return Array.isArray(data) ? (data as StationData[]) : [];
	} catch (error) {
		console.error('Error fetching gas stations from 2GIS:', error);
		return [];
	}
};

export const getBoundsCenter = (bounds: MapBounds): [number, number] => [
	(bounds.minLat + bounds.maxLat) / 2,
	(bounds.minLon + bounds.maxLon) / 2,
];

export const isStationDataFresh = (station: StationData, now = Date.now()): boolean => {
	const updatedAt = Date.parse(station.station?.last_transaction_at);
	return Number.isFinite(updatedAt) && now - updatedAt <= MAX_STATION_AGE_MS;
};

export interface QueueInfo {
	status: string;
	color: string;
	icon: string;
}

export const getQueueInfo = (level: string): QueueInfo => {
	switch (level) {
		case 'NONE':
			return { status: 'Свободно', color: '#059669', icon: 'fa-check-circle' };
		case 'UP_TO_25':
		case 'FROM_10_TO_25':
			return { status: 'Маленькая очередь', color: '#f59e0b', icon: 'fa-exclamation-circle' };
		case 'FROM_25_TO_50':
			return { status: 'Средняя очередь', color: '#ea580c', icon: 'fa-exclamation-triangle' };
		case 'OVER_50':
			return { status: 'Большая очередь', color: '#dc2626', icon: 'fa-exclamation-triangle' };
		default:
			return { status: 'Нет данных', color: '#999', icon: 'fa-question-circle' };
	}
};

export const getFuelName = (type: string): string => {
	switch (type) {
		case 'AI_92':
			return '92';
		case 'AI_95':
			return '95';
		case 'AI_98':
			return '98';
		case 'AI_100':
			return '100';
		case 'DT':
			return 'ДТ';
		case 'GAS':
			return 'Газ';
		default:
			return type;
	}
};

export const getFuelAvailability = (
	fuelStatuses: FuelStatus[] | undefined,
	fuelType: string,
): string => {
	if (!fuelStatuses) return 'В наличии';
	const status = fuelStatuses.find((s) => s.fuel_type === fuelType);
	if (!status) return 'В наличии';
	if (status.available === false) return 'Закончился';
	if (status.limit_liters && status.limit_liters > 0) return `Лимит ${status.limit_liters}л`;
	return 'В наличии';
};

const matchesSearch = (station: StationData, searchQuery: string): boolean => {
	const query = searchQuery.toLowerCase();
	return Boolean(
		station.station?.name?.toLowerCase().includes(query) ||
			station.station?.address?.toLowerCase().includes(query),
	);
};

/** Применяет пользовательские фильтры к списку станций и отбрасывает устаревшие данные. */
export const filterStations = (
	stations: StationData[],
	filters: StationFilters,
	now = Date.now(),
): StationData[] => {
	if (!Array.isArray(stations)) return [];
	const { searchQuery, fuelTypes, fuelLimit, onlyCanister, queue } = filters;

	return stations.filter((s) => {
		if (!isStationDataFresh(s, now)) return false;
		if (!matchesSearch(s, searchQuery)) return false;

		if (fuelTypes.length > 0) {
			const hasFuel = s.prices?.some((p) => fuelTypes.includes(p.fuel_type));
			if (!hasFuel) return false;
		}

		if (fuelLimit !== null) {
			const hasLimit = s.fuel_statuses?.some(
				(status) =>
					status.available !== false &&
					status.limit_liters === fuelLimit &&
					(fuelTypes.length === 0 || fuelTypes.includes(status.fuel_type)),
			);
			if (!hasLimit) return false;
		}

		if (onlyCanister && !s.can_use_canister) return false;

		if (queue === 'SMALL' && !SMALL_QUEUE_LEVELS.includes(s.queue_level)) return false;
		if (queue === 'LARGE' && !LARGE_QUEUE_LEVELS.includes(s.queue_level)) return false;

		return true;
	});
};
