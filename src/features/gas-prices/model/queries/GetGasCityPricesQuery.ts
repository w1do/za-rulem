import { readCitySnapshots } from '../../api/directusGasPrices';
import { optional } from '../../lib/optional';
import { buildBrandSummaries } from '../aggregate';
import type { GasBrandSummary, GasCityPriceData } from '../types';
import { loadGasBrands } from './brandRegistry';

export const loadCityBrandSummaries = async (citySlug: string): Promise<GasBrandSummary[]> => {
	const [snapshots, brands] = await Promise.all([
		optional(() => readCitySnapshots(citySlug), [], `snapshots unavailable for ${citySlug}`),
		loadGasBrands(),
	]);
	return buildBrandSummaries(snapshots, brands);
};

/** Цены по всем сетям города: единственный источник — снимки Directus. */
export const getGasCityPrices = async (citySlug: string): Promise<GasCityPriceData> => ({
	brands: await loadCityBrandSummaries(citySlug),
	fetchedAt: new Date().toISOString(),
});
