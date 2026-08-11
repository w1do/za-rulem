const TELEGRAM_API_BASE_URL = (
	process.env.TELEGRAM_API_BASE_URL ?? 'https://api.telegram.org'
).replace(/\/$/, '');

export class TelegramDeliveryError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TelegramDeliveryError';
	}
}

export const escapeTelegramHtml = (value: string): string =>
	value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export async function sendTelegramMessage(text: string): Promise<void> {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;

	if (!token || !chatId) {
		throw new TelegramDeliveryError('Telegram is not configured');
	}

	let response: Response;
	try {
		response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			}),
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		throw new TelegramDeliveryError('Telegram request failed');
	}

	const payload = (await response.json().catch(() => null)) as {
		ok?: boolean;
		description?: string;
	} | null;

	if (!response.ok || !payload?.ok) {
		throw new TelegramDeliveryError(payload?.description ?? `Telegram HTTP ${response.status}`);
	}
}
