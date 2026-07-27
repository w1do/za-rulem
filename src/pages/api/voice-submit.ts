import type { APIRoute } from 'astro';

/**
 * Отправка голосовой заявки в Telegram.
 */
const TELEGRAM_BOT_TOKEN =
	import.meta.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '8613339179:AAGmlfd9HjXZRmIQpN5ngmlYyYcJaEXOn2Q';
const TELEGRAM_CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '6420797957';
const TELEGRAM_API_BASE_URL = (
	import.meta.env.TELEGRAM_API_BASE_URL || process.env.TELEGRAM_API_BASE_URL || 'https://shrill-sun-ef51.wotdenike.workers.dev'
).replace(/\/$/, '');

export const prerender = false;

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

export const POST: APIRoute = async ({ request }) => {
	if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
		return new Response(JSON.stringify({ ok: false, error: 'Telegram is not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { text, phone, subject, service } = body;
	if (!text || !phone) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing text or phone' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const tgText = [
		`<b>🎙 ${escapeHtml(subject || 'Голосовая заявка')}</b>`,
		'',
		`<b>Телефон:</b> ${escapeHtml(phone)}`,
		service ? `<b>Код услуги:</b> ${escapeHtml(service)}` : '',
		`<b>Текст сообщения:</b>`,
		`<i>${escapeHtml(text)}</i>`,
	]
		.filter((line) => line !== '')
		.join('\n');

	try {
		const tgResponse = await fetch(
			`${TELEGRAM_API_BASE_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: TELEGRAM_CHAT_ID,
					text: tgText,
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
	} catch (error) {
		return new Response(JSON.stringify({ ok: false, error: 'Failed to reach Telegram' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
