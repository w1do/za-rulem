import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import test from 'node:test';
import {
	clearSwrCache,
	getOrFetchSwr,
	readDiskEntry,
	readSwrEntry,
	writeSwrEntry,
} from '../src/shared/lib/cache/fileSwrCache.ts';

const TEST_CACHE_DIR = path.join(process.cwd(), '.cache', 'test-swr');

test.beforeEach(() => {
	clearSwrCache(undefined, TEST_CACHE_DIR);
});

test.after(() => {
	if (fs.existsSync(TEST_CACHE_DIR)) {
		fs.rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
	}
});

test('fileSwrCache: saves to memory and disk and reads back', () => {
	const key = 'test:item:1';
	writeSwrEntry(key, { value: 42, name: 'City' }, TEST_CACHE_DIR);

	const mem = readSwrEntry<{ value: number; name: string }>(key, TEST_CACHE_DIR);
	assert.deepEqual(mem?.data, { value: 42, name: 'City' });

	const disk = readDiskEntry<{ value: number; name: string }>(key, TEST_CACHE_DIR);
	assert.deepEqual(disk?.data, { value: 42, name: 'City' });
});

test('fileSwrCache: returns fresh data without calling fetcher', async () => {
	let fetchCount = 0;
	const fetcher = async () => {
		fetchCount += 1;
		return { count: fetchCount };
	};

	const res1 = await getOrFetchSwr({
		key: 'test:fresh',
		ttlMs: 5000,
		fetcher,
		cacheDir: TEST_CACHE_DIR,
	});
	assert.equal(res1.count, 1);
	assert.equal(fetchCount, 1);

	const res2 = await getOrFetchSwr({
		key: 'test:fresh',
		ttlMs: 5000,
		fetcher,
		cacheDir: TEST_CACHE_DIR,
	});
	assert.equal(res2.count, 1);
	assert.equal(fetchCount, 1);
});

test('fileSwrCache: stale returns immediately and triggers background revalidation', async () => {
	let fetchCount = 0;
	const key = 'test:stale';

	// Записываем искусственно устаревший кеш (возраст 2 секунды, TTL 1 сек)
	const entry = writeSwrEntry(key, { version: 'v1' }, TEST_CACHE_DIR);
	entry.storedAt = Date.now() - 2000;

	const fetcher = async () => {
		fetchCount += 1;
		await new Promise((resolve) => setTimeout(resolve, 50));
		return { version: 'v2' };
	};

	const immediate = await getOrFetchSwr({
		key,
		ttlMs: 1000,
		staleTtlMs: 60000,
		fetcher,
		cacheDir: TEST_CACHE_DIR,
	});

	// Мгновенный возврат старых данных
	assert.equal(immediate.version, 'v1');

	// Ждем окончания фонового обновления
	await new Promise((resolve) => setTimeout(resolve, 100));
	assert.equal(fetchCount, 1);

	const updated = readSwrEntry<{ version: string }>(key, TEST_CACHE_DIR);
	assert.equal(updated?.data.version, 'v2');
});

test('fileSwrCache: deduplicates simultaneous in-flight requests', async () => {
	let callCount = 0;
	const fetcher = async () => {
		callCount += 1;
		await new Promise((resolve) => setTimeout(resolve, 50));
		return { data: 'ok' };
	};

	const [a, b, c] = await Promise.all([
		getOrFetchSwr({ key: 'test:dedup', ttlMs: 1000, fetcher, cacheDir: TEST_CACHE_DIR }),
		getOrFetchSwr({ key: 'test:dedup', ttlMs: 1000, fetcher, cacheDir: TEST_CACHE_DIR }),
		getOrFetchSwr({ key: 'test:dedup', ttlMs: 1000, fetcher, cacheDir: TEST_CACHE_DIR }),
	]);

	assert.deepEqual(a, { data: 'ok' });
	assert.deepEqual(b, { data: 'ok' });
	assert.deepEqual(c, { data: 'ok' });
	assert.equal(callCount, 1);
});

test('fileSwrCache: returns stale cache on fetch error without throwing', async () => {
	const key = 'test:error-stale';
	writeSwrEntry(key, { safe: true }, TEST_CACHE_DIR);

	const fetcher = async () => {
		throw new Error('Directus 500 error / connect timeout');
	};

	const res = await getOrFetchSwr({
		key,
		ttlMs: 10,
		staleTtlMs: 20, // Просрочен даже stale TTL
		fetcher,
		cacheDir: TEST_CACHE_DIR,
	});

	assert.deepEqual(res, { safe: true });
});

test('fileSwrCache: returns fallback when no cache exists and fetch fails', async () => {
	const fetcher = async () => {
		throw new Error('Total outage');
	};

	const res = await getOrFetchSwr({
		key: 'test:fallback',
		ttlMs: 1000,
		fetcher,
		fallback: { fallbackMode: true },
		cacheDir: TEST_CACHE_DIR,
	});

	assert.deepEqual(res, { fallbackMode: true });
});
