import type { APIRoute } from 'astro';

/**
 * Обратный геокодинг координат заявки: город и адрес по точке клиента.
 * Внешний сервис вызывается только с сервера, чтобы контролировать таймаут и заголовки.
 */
export const prerender = false;

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_TIMEOUT_MS = 6000;
const USER_AGENT = 'za-rulem.org request geocoder (support@za-rulem.org)';

const json = (body: unknown, status: number): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

type NominatimAddress = Record<string, unknown>;

const CITY_KEYS = ['city', 'town', 'village', 'municipality', 'county', 'state'] as const;

function pickCity(address: NominatimAddress): string {
	for (const key of CITY_KEYS) {
		const value = address[key];
		if (typeof value === 'string' && value.trim()) return value.trim();
	}
	return '';
}

export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400);
	}

	const raw = body as { lat?: unknown; lng?: unknown };
	const lat = Number(raw?.lat);
	const lng = Number(raw?.lng);

	if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
		return json({ ok: false, error: 'Некорректные координаты' }, 400);
	}

	const url = new URL(NOMINATIM_URL);
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('lat', lat.toFixed(6));
	url.searchParams.set('lon', lng.toFixed(6));
	url.searchParams.set('zoom', '18');
	url.searchParams.set('accept-language', 'ru');

	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});

		if (!res.ok) {
			return json({ ok: false, error: 'Сервис геокодинга недоступен' }, 502);
		}

		const data = (await res.json()) as { address?: NominatimAddress; display_name?: unknown };
		const address = data.address ?? {};
		const city = pickCity(address);

		if (!city) {
			return json({ ok: false, error: 'Не удалось определить город' }, 404);
		}

		return json(
			{
				ok: true,
				city,
				address: typeof data.display_name === 'string' ? data.display_name : '',
			},
			200,
		);
	} catch {
		return json({ ok: false, error: 'Сервис геокодинга недоступен' }, 502);
	}
};
