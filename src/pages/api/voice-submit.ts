import type { APIRoute } from 'astro';
import { escapeTelegramHtml, sendTelegramMessage } from '../../lib/server/telegram';

/**
 * Отправка голосовой заявки в Telegram.
 */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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
		`<b>🎙 ${escapeTelegramHtml(subject || 'Голосовая заявка')}</b>`,
		'',
		`<b>Телефон:</b> ${escapeTelegramHtml(phone)}`,
		service ? `<b>Код услуги:</b> ${escapeTelegramHtml(service)}` : '',
		`<b>Текст сообщения:</b>`,
		`<i>${escapeTelegramHtml(text)}</i>`,
	]
		.filter((line) => line !== '')
		.join('\n');

	try {
		await sendTelegramMessage(tgText);

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
