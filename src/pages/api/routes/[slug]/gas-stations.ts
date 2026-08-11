import type { APIRoute } from 'astro';
import {
	getRoadGasStations,
	RoadNotFoundError,
	RoadStationsUnavailableError,
} from '../../../../features/road-gas-stations/server';

export const prerender = false;

const jsonResponse = (body: unknown, status: number): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control':
				status === 200 ? 'public, max-age=60, stale-while-revalidate=240' : 'no-store',
		},
	});

export const GET: APIRoute = async ({ params }) => {
	const slug = params.slug;
	if (!slug) return jsonResponse({ error: 'Трасса не найдена' }, 404);

	try {
		return jsonResponse(await getRoadGasStations(slug), 200);
	} catch (error) {
		if (error instanceof RoadNotFoundError) {
			return jsonResponse({ error: 'Трасса не найдена' }, 404);
		}
		if (error instanceof RoadStationsUnavailableError) {
			return jsonResponse({ error: 'Данные АЗС временно недоступны' }, 503);
		}
		console.error('[road-gas-stations] Unexpected API error:', error);
		return jsonResponse({ error: 'Не удалось загрузить карту АЗС' }, 500);
	}
};
