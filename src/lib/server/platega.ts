/**
 * Минимальный серверный клиент Platega для создания платёжной ссылки.
 * Секреты merchant существуют только на сервере и не попадают в клиентский бандл.
 */
const PLATEGA_BASE_URL = (process.env.PLATEGA_BASE_URL ?? 'https://app.platega.io').replace(/\/$/, '');

export class PlategaNotConfiguredError extends Error {
	constructor() {
		super('Platega is not configured');
		this.name = 'PlategaNotConfiguredError';
	}
}

export class PlategaRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PlategaRequestError';
	}
}

export type CreatePaymentLinkInput = {
	amount: number;
	currency: string;
	description: string;
	payload: string;
	returnUrl: string;
	failedUrl: string;
};

type PlategaProcessResponse = {
	transactionId?: string;
	redirect?: string;
	url?: string;
};

function assertHttpsUrl(value: string, name: string): void {
	const url = new URL(value);
	if (url.protocol !== 'https:') {
		throw new PlategaRequestError(`${name} must use HTTPS`);
	}
}

function readRedirectUrl(payload: PlategaProcessResponse): string {
	const redirect = payload.redirect ?? payload.url;
	if (typeof redirect !== 'string' || redirect === '') {
		throw new PlategaRequestError('Platega response has no redirect url');
	}

	assertHttpsUrl(redirect, 'redirect');
	return redirect;
}

/**
 * Создаёт платёж с выбором метода на стороне Platega и возвращает только redirect URL.
 * Повторные попытки не выполняются: у ручки нет idempotency key.
 */
export async function createPlategaPaymentLink(input: CreatePaymentLinkInput): Promise<{
	redirectUrl: string;
	transactionId: string | null;
}> {
	const merchantId = process.env.PLATEGA_MERCHANT_ID;
	const secret = process.env.PLATEGA_SECRET;

	if (!merchantId || !secret) {
		throw new PlategaNotConfiguredError();
	}

	if (!Number.isFinite(input.amount) || input.amount <= 0) {
		throw new PlategaRequestError('amount must be a positive number');
	}

	assertHttpsUrl(input.returnUrl, 'returnUrl');
	assertHttpsUrl(input.failedUrl, 'failedUrl');

	let response: Response;
	try {
		response = await fetch(`${PLATEGA_BASE_URL}/v2/transaction/process`, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-MerchantId': merchantId,
				'X-Secret': secret,
			},
			body: JSON.stringify({
				paymentDetails: { amount: input.amount, currency: input.currency },
				description: input.description,
				payload: input.payload,
				return: input.returnUrl,
				failedUrl: input.failedUrl,
			}),
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		throw new PlategaRequestError('Platega request failed');
	}

	const payload = (await response.json().catch(() => null)) as PlategaProcessResponse | null;

	if (!response.ok || !payload) {
		throw new PlategaRequestError(`Platega HTTP ${response.status}`);
	}

	return {
		redirectUrl: readRedirectUrl(payload),
		transactionId: typeof payload.transactionId === 'string' ? payload.transactionId : null,
	};
}
