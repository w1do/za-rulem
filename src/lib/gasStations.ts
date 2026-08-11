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
	brandAliases: string[];
	fuelTypes: string[];
	fuelLimit: number | null;
	onlyCanister: boolean;
	queue: QueueFilter;
}

export interface PriceRow {
	brand: string;
	ai92: string;
	ai95: string;
	diesel: string;
}

export interface StationMapAction {
	href: string;
	label: string;
	draftContext?: string;
	service?: string;
	subject?: string;
	title?: string;
}

export const buildStationActionHref = (
	action: StationMapAction,
	item: StationData,
): string => {
	if (!action.draftContext) return action.href;
	const url = new URL(action.href, 'https://za-rulem.local');
	const draft = [
		`АЗС «${item.station.name}»`,
		item.station.address,
		action.draftContext,
		'Подскажите, какая сейчас обстановка с топливом и очередью?',
	]
		.filter(Boolean)
		.join('. ');
	url.searchParams.set('draft', draft);
	return /^https?:\/\//i.test(action.href)
		? url.toString()
		: `${url.pathname}${url.search}${url.hash}`;
};

const STATIONS_API_URL = 'https://benzin.api.2gis.ru/api/v1/stations';
const STATIONS_REQUEST_TIMEOUT_MS = 8000;

export interface StationsFetchResult {
	stations: StationData[];
	isSuccessful: boolean;
}

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

export const isStationData = (value: unknown): value is StationData => {
	if (!isRecord(value) || !isRecord(value.station)) return false;
	const { station } = value;
	return (
		typeof station.id === 'string' &&
		typeof station.name === 'string' &&
		typeof station.address === 'string' &&
		Number.isFinite(Number(station.lat)) &&
		Number.isFinite(Number(station.lng)) &&
		Array.isArray(value.fuel_statuses) &&
		Array.isArray(value.prices)
	);
};

const mapStationData = (value: StationData): StationData => ({
	station: {
		id: value.station.id,
		region_id: Number(value.station.region_id) || 0,
		name: value.station.name,
		brand: typeof value.station.brand === 'string' ? value.station.brand : '',
		address: value.station.address,
		lat: Number(value.station.lat),
		lng: Number(value.station.lng),
		last_transaction_at:
			typeof value.station.last_transaction_at === 'string'
				? value.station.last_transaction_at
				: '',
		has_shop: Boolean(value.station.has_shop),
		has_cafe: Boolean(value.station.has_cafe),
		has_toilet: Boolean(value.station.has_toilet),
		has_car_wash: Boolean(value.station.has_car_wash),
		pay_card: Boolean(value.station.pay_card),
		pay_cash: Boolean(value.station.pay_cash),
		pay_sbp: Boolean(value.station.pay_sbp),
		fuel_assortment: Array.isArray(value.station.fuel_assortment)
			? value.station.fuel_assortment.filter((fuel): fuel is string => typeof fuel === 'string')
			: [],
	},
	fuel_statuses: value.fuel_statuses
		.filter((status) => isRecord(status) && typeof status.fuel_type === 'string')
		.map((status) => ({
			station_id: typeof status.station_id === 'string' ? status.station_id : value.station.id,
			fuel_type: status.fuel_type,
			available: typeof status.available === 'boolean' ? status.available : null,
			queue_level: typeof status.queue_level === 'string' ? status.queue_level : 'UNKNOWN',
			limit_liters: Number.isFinite(Number(status.limit_liters))
				? Number(status.limit_liters)
				: undefined,
			reports_count: Number.isFinite(Number(status.reports_count))
				? Number(status.reports_count)
				: undefined,
			last_report_at: typeof status.last_report_at === 'string' ? status.last_report_at : undefined,
		})),
	prices: value.prices
		.filter((price) => isRecord(price) && typeof price.fuel_type === 'string')
		.map((price) => ({
			station_id: typeof price.station_id === 'string' ? price.station_id : value.station.id,
			fuel_type: price.fuel_type,
			price: Number(price.price) || 0,
			updated_at: typeof price.updated_at === 'string' ? price.updated_at : '',
		})),
	status: typeof value.status === 'string' ? value.status : 'UNKNOWN',
	closed: Boolean(value.closed),
	queue_level: typeof value.queue_level === 'string' ? value.queue_level : 'UNKNOWN',
	can_use_canister:
		typeof value.can_use_canister === 'boolean' ? value.can_use_canister : undefined,
});

/** Запрашивает и проверяет внешний ответ, сохраняя признак transport-ошибки. */
export const fetchGasStationsResult = async (bounds: MapBounds): Promise<StationsFetchResult> => {
	try {
		const response = await fetch(buildStationsUrl(bounds), {
			signal: AbortSignal.timeout(STATIONS_REQUEST_TIMEOUT_MS),
		});
		if (!response.ok) {
			console.error(`2GIS stations request failed with status ${response.status}`);
			return { stations: [], isSuccessful: false };
		}
		const data: unknown = await response.json();
		if (!Array.isArray(data)) return { stations: [], isSuccessful: false };
		return { stations: data.filter(isStationData).map(mapStationData), isSuccessful: true };
	} catch (error) {
		console.error('Error fetching gas stations from 2GIS:', error);
		return { stations: [], isSuccessful: false };
	}
};

/**
 * Загружает станции по границам города.
 * Ошибка сети или неуспешный ответ не ломают страницу: возвращается пустой список.
 */
export const fetchGasStations = async (bounds: MapBounds): Promise<StationData[]> => {
	const result = await fetchGasStationsResult(bounds);
	return result.stations;
};

/** Вычисляет геометрический центр области для инициализации карты. */
export const getBoundsCenter = (bounds: MapBounds): [number, number] => {
	const lat = (Number(bounds.minLat) + Number(bounds.maxLat)) / 2;
	const lng = (Number(bounds.minLon) + Number(bounds.maxLon)) / 2;

	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		// Нейтральный центр России: не связываем аварийный fallback с базовым городом.
		return [61.524, 105.319];
	}

	return [lat, lng];
};

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

const normalizeBrand = (value: string): string =>
	value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').replace(/\s+/g, ' ').trim();

/** Сопоставляет бренд с полями feed без ложного совпадения «Газпром» → «Газпромнефть». */
export const matchesStationBrand = (station: StationData, aliases: string[]): boolean => {
	if (aliases.length === 0) return true;
	const candidates = [station.station.brand, station.station.name]
		.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
		.map(normalizeBrand);

	return aliases.some((alias) => {
		const normalizedAlias = normalizeBrand(alias);
		return candidates.some(
			(candidate) =>
				candidate === normalizedAlias ||
				candidate.startsWith(`${normalizedAlias},`) ||
				candidate.startsWith(`${normalizedAlias} `),
		);
	});
};

/** Применяет пользовательские фильтры к списку станций и отбрасывает устаревшие данные. */
export const filterStations = (
	stations: StationData[],
	filters: StationFilters,
	now = Date.now(),
): StationData[] => {
	if (!Array.isArray(stations)) return [];
	const { searchQuery, brandAliases, fuelTypes, fuelLimit, onlyCanister, queue } = filters;

	return stations.filter((s) => {
		if (!isStationDataFresh(s, now)) return false;
		if (!matchesSearch(s, searchQuery)) return false;
		if (!matchesStationBrand(s, brandAliases)) return false;

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

/**
 * Рассчитывает средние цены на топливо по брендам АЗС на основе списка станций.
 * Используется для сводной таблицы цен в городе.
 */
export const getFuelPricesFromStations = (stations: StationData[]): PriceRow[] => {
	if (!Array.isArray(stations)) return [];

	const brandPrices: Record<string, { ai92: number[]; ai95: number[]; dt: number[] }> = {};

	stations.forEach((item) => {
		const station = item.station;
		if (!station) return;

		// Используем бренд или первое слово из названия
		const brand = station.brand || station.name.split(' ')[0];
		if (!brand) return;

		if (!brandPrices[brand]) {
			brandPrices[brand] = { ai92: [], ai95: [], dt: [] };
		}

		item.prices?.forEach((p) => {
			if (p.fuel_type === 'AI_92' && p.price > 0) brandPrices[brand].ai92.push(p.price);
			if (p.fuel_type === 'AI_95' && p.price > 0) brandPrices[brand].ai95.push(p.price);
			if (p.fuel_type === 'DT' && p.price > 0) brandPrices[brand].dt.push(p.price);
		});
	});

	return Object.keys(brandPrices)
		.map((brand) => {
			const avg = (arr: number[]) =>
				arr.length
					? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) + ' ₽'
					: '-';

			return {
				brand,
				ai92: avg(brandPrices[brand].ai92),
				ai95: avg(brandPrices[brand].ai95),
				diesel: avg(brandPrices[brand].dt),
			};
		})
		.filter((p) => p.ai92 !== '-' || p.ai95 !== '-' || p.diesel !== '-')
		// Сортируем по бренду, но Газпромнефть, Лукойл и Роснефть выносим вперед, если они есть
		.sort((a, b) => {
			const priorityBrands = ['Газпромнефть', 'Лукойл', 'Роснефть'];
			const aIndex = priorityBrands.indexOf(a.brand);
			const bIndex = priorityBrands.indexOf(b.brand);

			if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
			if (aIndex !== -1) return -1;
			if (bIndex !== -1) return 1;

			return a.brand.localeCompare(b.brand);
		})
		.slice(0, 10);
};
