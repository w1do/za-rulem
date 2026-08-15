import { readGasBrands } from '../../api/directusGasPrices';
import { optional } from '../../lib/optional';
import type { GasBrand } from '../types';

let brandsCache: GasBrand[] | undefined;
let brandsInFlight: Promise<GasBrand[]> | undefined;

/**
 * Реестр брендов читается многими страницами во время одной сборки. Держим
 * один in-flight запрос и кешируем только успешный ответ, чтобы временный
 * таймаут не превращался в серию одинаковых запросов к Directus.
 */
export const loadGasBrands = async (): Promise<GasBrand[]> => {
	if (brandsCache) return brandsCache;
	if (brandsInFlight) return brandsInFlight;

	brandsInFlight = optional(readGasBrands, [], 'brand registry unavailable');
	try {
		const brands = await brandsInFlight;
		if (brands.length > 0) brandsCache = brands;
		return brands;
	} finally {
		brandsInFlight = undefined;
	}
};
