import type { APIRoute } from 'astro';
import {
	PlategaNotConfiguredError,
	createPlategaPaymentLink,
} from '../../../lib/server/platega';

/**
 * Создание платёжной ссылки на предоплату приоритетной очереди.
 * Сумма определяется сервером, браузер передаёт только контакт и город.
 */
export const prerender = false;

const SITE_URL = 'https://za-rulem.org';
const CURRENCY = 'RUB';

const json = (body: unknown, status: number): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

function getPrepaymentAmount(): number {
	const raw = Number(process.env.PLATEGA_PREPAYMENT_AMOUNT ?? '1000');
	return Number.isFinite(raw) && raw > 0 ? raw : 1000;
}

export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: 'Invalid JSON' }, 400);
	}

	const phone = typeof (body as { phone?: unknown })?.phone === 'string'
		? (body as { phone: string }).phone.trim()
		: '';
	const city = typeof (body as { city?: unknown })?.city === 'string'
		? (body as { city: string }).city.trim()
		: '';

	if (!phone) {
		return json({ ok: false, error: 'Не указан номер телефона' }, 400);
	}

	try {
		const payment = await createPlategaPaymentLink({
			amount: getPrepaymentAmount(),
			currency: CURRENCY,
			description: `Предоплата приоритетной доставки топлива${city ? ` — ${city}` : ''}`,
			payload: crypto.randomUUID(),
			returnUrl: `${SITE_URL}/?prepayment=success`,
			failedUrl: `${SITE_URL}/?prepayment=failed`,
		});

		return json({ ok: true, redirectUrl: payment.redirectUrl }, 200);
	} catch (error) {
		if (error instanceof PlategaNotConfiguredError) {
			return json({ ok: false, error: 'Оплата временно недоступна', code: 'not_configured' }, 503);
		}

		return json({ ok: false, error: 'Не удалось создать оплату. Попробуйте позже.' }, 502);
	}
};
