import { readBrandAreaSlugs, readBrandHistory } from '../../api/directusGasPrices';
import { optional } from '../../lib/optional';
import { decodeSlug, toLatinBrandSlug } from '../brandSlug';
import type { GasBrandPriceData } from '../types';
import { loadCityBrandSummaries } from './GetGasCityPricesQuery';

const HISTORY_PER_PAGE = 48;

export class GasBrandNotFoundError extends Error {}

export const getGasBrandPrices = async (
	citySlug: string,
	brandSlug: string,
	page = 1,
): Promise<GasBrandPriceData> => {
	const summaries = await loadCityBrandSummaries(citySlug);
	const requestedSlug = decodeSlug(brandSlug);
	const publicSlug = toLatinBrandSlug(requestedSlug) || requestedSlug;
	const summary = summaries.find(
		(item) => item.brand.slug === publicSlug || item.brand.sourceSlug === requestedSlug,
	);
	if (!summary) throw new GasBrandNotFoundError(`АЗС ${brandSlug} не найдена в городе ${citySlug}`);

	const sourceSlug = summary.brand.sourceSlug ?? summary.brand.slug;

	const safePage = Math.max(1, Math.floor(page));
	const [history, otherAreaSlugs] = await Promise.all([
		optional(
			() => readBrandHistory(citySlug, sourceSlug, safePage, HISTORY_PER_PAGE),
			{ items: [], total: 0 },
			`brand history unavailable for ${citySlug}/${sourceSlug}`,
		),
		optional(() => readBrandAreaSlugs(sourceSlug), [], `city links unavailable for ${sourceSlug}`),
	]);

	return {
		summary,
		history: history.items,
		historyTotal: history.total,
		page: safePage,
		perPage: HISTORY_PER_PAGE,
		relatedBrands: summaries.filter((item) => item.brand.slug !== summary.brand.slug).slice(0, 8),
		otherAreaSlugs,
		fetchedAt: new Date().toISOString(),
	};
};
