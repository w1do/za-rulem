import { cities } from '../../../../lib/cities';
import { readGasPriceSitemapEntries } from '../../api/directusGasPrices';
import { optional } from '../../lib/optional';
import { isGasPriceHistoryReadyForIndexing, mergeBrandRegistry, resolveGasBrand } from '../aggregate';
import { gasPricesUrl } from '../urls';
import { loadGasBrands } from './brandRegistry';

const SITEMAP_WINDOW_DAYS = 14;

export const getGasPriceSitemapUrls = async (site: string): Promise<string[]> => {
	const since = new Date(Date.now() - SITEMAP_WINDOW_DAYS * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
	const [brands, entries] = await Promise.all([
		loadGasBrands(),
		optional(() => readGasPriceSitemapEntries(since), [], 'sitemap entries unavailable'),
	]);
	const registry = mergeBrandRegistry(brands);
	const urls: string[] = [];
	for (const entry of entries) {
		const city = cities.find((item) => item.slug === entry.citySlug && item.isIndexable !== false);
		const brand = resolveGasBrand(entry.brandSlug, registry);
		if (!city) continue;
		if (isGasPriceHistoryReadyForIndexing(brand, entry.sourceUpdatedAt, entry.snapshotCount)) {
			urls.push(new URL(gasPricesUrl(city.slug, brand.slug), site).href);
		}
	}
	return [...new Set(urls)].sort();
};
