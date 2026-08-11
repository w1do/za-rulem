import { toNumber, toText } from './parse';
import type { ChatCity } from './types';

/** Запись коллекции `cities` Directus: данные снаружи, поэтому все поля недоверенные. */
export type CityDto = {
	slug?: unknown;
	name?: unknown;
	case_in?: unknown;
	case_of?: unknown;
	case_by?: unknown;
	case_for?: unknown;
	hint?: unknown;
	region?: unknown;
	population?: unknown;
	is_featured?: unknown;
	is_default?: unknown;
	is_indexable?: unknown;
	seo_title?: unknown;
	seo_description?: unknown;
	bounds_min_lat?: unknown;
	bounds_max_lat?: unknown;
	bounds_min_lon?: unknown;
	bounds_max_lon?: unknown;
};

/** Поля, которые запрашиваются у Directus; порядок совпадает с `CityDto`. */
export const CITY_FIELDS = [
	'slug',
	'name',
	'case_in',
	'case_of',
	'case_by',
	'case_for',
	'hint',
	'region',
	'population',
	'is_featured',
	'is_default',
	'is_indexable',
	'seo_title',
	'seo_description',
	'bounds_min_lat',
	'bounds_max_lat',
	'bounds_min_lon',
	'bounds_max_lon',
].join(',');

/** Город или null, если запись неполная: неполные города ломали бы карту и падежи в текстах. */
export const toCity = (dto: CityDto): ChatCity | null => {
	const slug = toText(dto.slug);
	const name = toText(dto.name);
	const inCity = toText(dto.case_in);
	const ofCity = toText(dto.case_of);
	const byCity = toText(dto.case_by);
	const forCity = toText(dto.case_for);
	const minLat = toNumber(dto.bounds_min_lat);
	const maxLat = toNumber(dto.bounds_max_lat);
	const minLon = toNumber(dto.bounds_min_lon);
	const maxLon = toNumber(dto.bounds_max_lon);

	if (!/^[a-z0-9-]+$/.test(slug) || !name || !inCity || !ofCity || !byCity || !forCity) return null;
	if (minLat === null || maxLat === null || minLon === null || maxLon === null) return null;
	if (minLat >= maxLat || minLon >= maxLon) return null;

	// Защита от "нулевых" координат, которые могут прийти при ошибке геокодирования.
	// Координаты 0,0 невозможны для городов РФ (это Гвинейский залив).
	if (Math.abs(minLat) < 0.1 && Math.abs(minLon) < 0.1) return null;

	return {
		slug,
		name,
		inCity,
		ofCity,
		byCity,
		forCity,
		hint: toText(dto.hint) || toText(dto.region),
		region: toText(dto.region),
		population: toNumber(dto.population) ?? 0,
		isFeatured: dto.is_featured === true,
		isDefault: dto.is_default === true,
		isIndexable: dto.is_indexable !== false,
		seoTitle: toText(dto.seo_title),
		seoDescription: toText(dto.seo_description),
		bounds: { minLat, maxLat, minLon, maxLon },
	};
};
