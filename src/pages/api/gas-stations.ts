import type { APIRoute } from 'astro';
import { readCityStations, readStations } from '../../features/gas-stations';

export const prerender = false;

/**
 * Станции для карты. Основной режим — по городу (`?city=<slug>`): состав и цены берутся
 * из снимков `gas_daily`. Режим по границам (`?minLat=...`) остаётся для участков трасс.
 */
export const GET: APIRoute = async ({ url }) => {
	const citySlug = url.searchParams.get('city');
	const minLat = parseFloat(url.searchParams.get('minLat') || '');
	const maxLat = parseFloat(url.searchParams.get('maxLat') || '');
	const minLon = parseFloat(url.searchParams.get('minLon') || '');
	const maxLon = parseFloat(url.searchParams.get('maxLon') || '');

	const hasBounds = ![minLat, maxLat, minLon, maxLon].some((value) => isNaN(value));

	if (!citySlug && !hasBounds) {
		return new Response(JSON.stringify({ error: 'Missing city or bounds parameters' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const stations = citySlug
			? await readCityStations(citySlug)
			: await readStations({ minLat, maxLat, minLon, maxLon });

		return new Response(JSON.stringify(stations), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
			},
		});
	} catch (error) {
		console.error('[api/gas-stations] Failed to fetch stations from Directus:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
