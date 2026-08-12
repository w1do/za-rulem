import { timingSafeEqual } from 'node:crypto';
import type { APIRoute } from 'astro';
import { collectGasPriceSnapshotBatch } from '../../../../features/gas-prices/server';
import type { SnapshotBatchInput } from '../../../../features/gas-prices/model/types';

export const prerender = false;

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
	status,
	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

export const isValidCronAuthorization = (authorization: string, secret: string): boolean => {
	if (!secret || !authorization.startsWith('Bearer ')) return false;
	const received = Buffer.from(authorization.slice(7));
	const expected = Buffer.from(secret);
	return received.length === expected.length && timingSafeEqual(received, expected);
};

const parseInput = (value: unknown): SnapshotBatchInput | null => {
	if (!isRecord(value)) return null;
	const cursor = Number(value.cursor ?? 0);
	const limit = Number(value.limit ?? 10);
	const dryRun = value.dryRun === true;
	if (!Number.isInteger(cursor) || cursor < 0 || !Number.isInteger(limit) || limit < 1 || limit > 10) {
		return null;
	}
	return { cursor, limit, dryRun };
};

export const POST: APIRoute = async ({ request }) => {
	const secret = process.env.GAS_PRICE_CRON_SECRET || '';
	if (!isValidCronAuthorization(request.headers.get('authorization') || '', secret)) {
		return json({ error: 'Unauthorized' }, 401);
	}
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}
	const input = parseInput(payload);
	if (!input) return json({ error: 'cursor must be >= 0; limit must be from 1 to 10' }, 422);
	return json(await collectGasPriceSnapshotBatch(input));
};

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405);
