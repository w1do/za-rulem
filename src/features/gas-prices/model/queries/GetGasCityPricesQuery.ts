import { readCitySnapshots, readRecentCitySnapshots } from '../../api/directusGasPrices';
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

/** Read model для каталогов, которым нужны цены сразу по нескольким городам. */
export const loadRecentCityBrandSummaries = async (
	since: string,
	now = new Date(),
): Promise<Map<string, GasBrandSummary[]>> => {
	const [snapshots, brands] = await Promise.all([
		optional(() => readRecentCitySnapshots(since), [], 'recent city snapshots unavailable'),
		loadGasBrands(),
	]);
	const snapshotsByCity = new Map<string, typeof snapshots>();

	for (const snapshot of snapshots) {
		const citySnapshots = snapshotsByCity.get(snapshot.areaSlug) ?? [];
		citySnapshots.push(snapshot);
		snapshotsByCity.set(snapshot.areaSlug, citySnapshots);
	}

	return new Map(
		[...snapshotsByCity].map(([citySlug, citySnapshots]) => [
			citySlug,
			buildBrandSummaries(citySnapshots, brands, now),
		]),
	);
};

/** Цены по всем сетям города: единственный источник — снимки Directus. */
export const getGasCityPrices = async (citySlug: string): Promise<GasCityPriceData> => ({
	brands: await loadCityBrandSummaries(citySlug),
	fetchedAt: new Date().toISOString(),
});
