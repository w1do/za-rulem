import type { APIRoute } from 'astro';

/**
 * Приём заявки на выезд и отправка в Telegram.
 * Токен бота только на сервере — клиент ходит сюда, не в Bot API.
 */
const TELEGRAM_BOT_TOKEN =
	import.meta.env.TELEGRAM_BOT_TOKEN || '8613339179:AAGmlfd9HjXZRmIQpN5ngmlYyYcJaEXOn2Q';
const TELEGRAM_CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID || '6420797957';
const TELEGRAM_API_BASE_URL = (
	import.meta.env.TELEGRAM_API_BASE_URL || 'https://shrill-sun-ef51.wotdenike.workers.dev'
).replace(/\/$/, '');

export const prerender = false;

type Body = {
	location?: string;
	help?: string;
	phone?: string;
	car_brand?: string;
	gos_number?: string;
	message?: string;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function buildTelegramText(data: Required<Body>): string {
	return [
		'<b>Новая заявка — za-rulem</b>',
		'',
		`<b>Помощь:</b> ${escapeHtml(data.help)}`,
		`<b>Где:</b> ${escapeHtml(data.location)}`,
		`<b>Телефон:</b> ${escapeHtml(data.phone)}`,
		`<b>Авто:</b> ${escapeHtml(data.car_brand)}`,
		`<b>Госномер:</b> ${escapeHtml(data.gos_number)}`,
		data.message ? `<b>Комментарий:</b> ${escapeHtml(data.message)}` : '',
	]
		.filter(Boolean)
		.join('\n');
}

export const POST: APIRoute = async ({ request }) => {
	if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
		return new Response(JSON.stringify({ ok: false, error: 'Telegram is not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body: Body;
	try {
		body = (await request.json()) as Body;
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const location = String(body.location ?? '').trim();
	const help = String(body.help ?? '').trim();
	const phone = String(body.phone ?? '').trim();
	const car_brand = String(body.car_brand ?? '').trim();
	const gos_number = String(body.gos_number ?? '').trim();
	const message = String(body.message ?? '').trim();

	if (!location || !help || !phone || !car_brand || !gos_number) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const text = buildTelegramText({
		location,
		help,
		phone,
		car_brand,
		gos_number,
		message,
	});

	try {
		const tgResponse = await fetch(
			`${TELEGRAM_API_BASE_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: TELEGRAM_CHAT_ID,
					text,
					parse_mode: 'HTML',
					disable_web_page_preview: true,
				}),
			},
		);

		const tgJson = (await tgResponse.json().catch(() => null)) as {
			ok?: boolean;
			description?: string;
		} | null;

		if (!tgResponse.ok || !tgJson?.ok) {
			return new Response(
				JSON.stringify({
					ok: false,
					error: tgJson?.description || `Telegram HTTP ${tgResponse.status}`,
				}),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Failed to reach Telegram' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export const ALL: APIRoute = async () =>
	new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
		status: 405,
		headers: { 'Content-Type': 'application/json' },
	});
