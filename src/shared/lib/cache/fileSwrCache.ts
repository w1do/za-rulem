import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface SwrCacheEntry<T> {
	data: T;
	storedAt: number;
	key: string;
}

export interface SwrOptions<T> {
	/** Уникальный ключ кеша (например, `cities:published`, `gas-prices:city:tyumen`) */
	key: string;
	/** Время актуальности кеша в миллисекундах (TTL свежести) */
	ttlMs: number;
	/**
	 * Максимальное время допустимости устаревших данных (stale TTL).
	 * По умолчанию 7 дней (данные отдаются мгновенно, а обновление запускается в фоне).
	 */
	staleTtlMs?: number;
	/** Функция загрузки свежих данных */
	fetcher: () => Promise<T>;
	/** Безопасный fallback, если загрузка упала и в кеше ничего нет */
	fallback?: T;
	/** Каталог для дискового кеша (по умолчанию `.cache/swr`) */
	cacheDir?: string;
}

interface SwrMemoryState {
	entries: Map<string, SwrCacheEntry<unknown>>;
	inFlight: Map<string, Promise<unknown>>;
}

const GLOBAL_CACHE_KEY = '__zaRulemSwrMemoryCache';
const globalScope = globalThis as typeof globalThis & {
	[GLOBAL_CACHE_KEY]?: SwrMemoryState;
};

const memoryState: SwrMemoryState = (globalScope[GLOBAL_CACHE_KEY] ??= {
	entries: new Map(),
	inFlight: new Map(),
});

const DEFAULT_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней
const DEFAULT_REQUEST_TIMEOUT_MS = 3_000; // 3 секунды

const isServer = typeof window === 'undefined' && typeof process !== 'undefined';

/** Получает путь к каталогу дискового кеша с проверкой доступности на запись */
export const resolveCacheDir = (customDir?: string): string => {
	if (!isServer) return '';
	if (customDir) return customDir;
	if (process.env?.SWR_CACHE_DIR) return process.env.SWR_CACHE_DIR;

	const projectDir = path.join(process.cwd(), '.cache', 'swr');
	try {
		if (!fs.existsSync(projectDir)) {
			fs.mkdirSync(projectDir, { recursive: true });
		}
		return projectDir;
	} catch {
		const tmpDir = path.join('/tmp', 'za-rulem-swr-cache');
		try {
			if (!fs.existsSync(tmpDir)) {
				fs.mkdirSync(tmpDir, { recursive: true });
			}
		} catch {
			// Игнорируем ошибку создания fallback-каталога
		}
		return tmpDir;
	}
};

/** Генерирует безопасное имя файла на основе ключа */
const keyToFilename = (key: string): string => {
	const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
	const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
	return `${sanitized}-${hash}.json`;
};

/** Читает запись из дискового кеша (L2) */
export const readDiskEntry = <T>(key: string, cacheDir?: string): SwrCacheEntry<T> | null => {
	if (!isServer) return null;
	try {
		const dir = resolveCacheDir(cacheDir);
		if (!dir) return null;
		const filePath = path.join(dir, keyToFilename(key));
		if (!fs.existsSync(filePath)) return null;

		const content = fs.readFileSync(filePath, 'utf8');
		const entry = JSON.parse(content) as SwrCacheEntry<T>;
		if (!entry || typeof entry.storedAt !== 'number') return null;

		return entry;
	} catch (error) {
		console.warn(`[fileSwrCache] Ошибка чтения дискового кеша для ${key}:`, error);
		return null;
	}
};

/** Сохраняет запись в дисковый кеш (L2) */
export const writeDiskEntry = <T>(key: string, data: T, cacheDir?: string): SwrCacheEntry<T> => {
	const entry: SwrCacheEntry<T> = {
		key,
		data,
		storedAt: Date.now(),
	};

	if (!isServer) return entry;

	try {
		const dir = resolveCacheDir(cacheDir);
		if (!dir) return entry;
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		const filePath = path.join(dir, keyToFilename(key));
		const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;

		fs.writeFileSync(tempPath, JSON.stringify(entry), 'utf8');
		fs.renameSync(tempPath, filePath);
	} catch (error) {
		console.warn(`[fileSwrCache] Ошибка записи дискового кеша для ${key}:`, error);
	}

	return entry;
};

/** Читает запись из L1 (RAM) или L2 (Disk) */
export const readSwrEntry = <T>(key: string, cacheDir?: string): SwrCacheEntry<T> | null => {
	// Проверяем L1 RAM
	const mem = memoryState.entries.get(key) as SwrCacheEntry<T> | undefined;
	if (mem) return mem;

	// Проверяем L2 Disk
	const disk = readDiskEntry<T>(key, cacheDir);
	if (disk) {
		memoryState.entries.set(key, disk as SwrCacheEntry<unknown>);
		return disk;
	}

	return null;
};

/** Сохраняет запись в L1 (RAM) и L2 (Disk) */
export const writeSwrEntry = <T>(key: string, data: T, cacheDir?: string): SwrCacheEntry<T> => {
	const entry = writeDiskEntry(key, data, cacheDir);
	memoryState.entries.set(key, entry as SwrCacheEntry<unknown>);
	return entry;
};

/** Очищает кеш для конкретного ключа или полностью */
export const clearSwrCache = (key?: string, cacheDir?: string): void => {
	if (key) {
		memoryState.entries.delete(key);
		memoryState.inFlight.delete(key);
		if (!isServer) return;
		try {
			const dir = resolveCacheDir(cacheDir);
			if (!dir) return;
			const filePath = path.join(dir, keyToFilename(key));
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		} catch {
			// Игнорируем ошибки удаления
		}
	} else {
		memoryState.entries.clear();
		memoryState.inFlight.clear();
		if (!isServer) return;
		try {
			const dir = resolveCacheDir(cacheDir);
			if (!dir) return;
			if (fs.existsSync(dir)) {
				const files = fs.readdirSync(dir);
				for (const file of files) {
					if (file.endsWith('.json')) {
						fs.unlinkSync(path.join(dir, file));
					}
				}
			}
		} catch {
			// Игнорируем ошибки удаления
		}
	}
};

/**
 * Выполняет сетевой запрос с жестким таймаутом и перехватом ошибок соединения.
 */
export const safeFetchWithTimeout = async (
	input: RequestInfo | URL,
	init?: RequestInit,
	timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Response> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);

	const signals: AbortSignal[] = [controller.signal];
	if (init?.signal) {
		signals.push(init.signal);
	}
	const combinedSignal = AbortSignal.any ? AbortSignal.any(signals) : controller.signal;

	try {
		return await fetch(input, {
			...init,
			signal: combinedSignal,
		});
	} catch (error) {
		const isTimeout =
			error instanceof Error &&
			(error.name === 'AbortError' ||
				error.name === 'TimeoutError' ||
				error.message.includes('Timeout') ||
				(error as { code?: string }).code === 'UND_ERR_CONNECT_TIMEOUT');

		if (isTimeout) {
			const target = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			throw new Error(`[NetworkTimeout] Соединение с ${target} прервано по таймауту (${timeoutMs}ms)`);
		}

		throw error;
	} finally {
		clearTimeout(timer);
	}
};

/**
 * Выполняет фоновую ревалидацию данных с дедупликацией одновременных вызовов.
 */
const runBackgroundRevalidation = <T>(options: SwrOptions<T>): void => {
	const { key, fetcher, cacheDir } = options;
	if (memoryState.inFlight.has(key)) return;

	const task = (async () => {
		try {
			const freshData = await fetcher();
			writeSwrEntry(key, freshData, cacheDir);
		} catch (error) {
			console.warn(
				`[fileSwrCache] Фоновое обновление не удалось для ${key}:`,
				error instanceof Error ? error.message : error,
			);
		}
	})().finally(() => {
		memoryState.inFlight.delete(key);
	});

	memoryState.inFlight.set(key, task);
};

/**
 * Получает данные по стратегии Stale-While-Revalidate:
 * 1. Если данные в RAM/Disk свежие (age < ttl) — мгновенный возврат.
 * 2. Если данные устарели (ttl <= age < staleTtl) — мгновенный возврат stale + фоновый fetch.
 * 3. Если данных нет или они старше staleTtl — ожидание fetcher.
 * 4. При падении fetcher — возврат любого имеющегося stale-кеша или fallback.
 */
export const getOrFetchSwr = async <T>(options: SwrOptions<T>): Promise<T> => {
	const {
		key,
		ttlMs,
		staleTtlMs = DEFAULT_STALE_TTL_MS,
		fetcher,
		fallback,
		cacheDir,
	} = options;

	const now = Date.now();
	const cached = readSwrEntry<T>(key, cacheDir);

	if (cached) {
		const age = now - cached.storedAt;

		// 1. Кеш свежий
		if (age < ttlMs) {
			return cached.data;
		}

		// 2. Кеш stale, но в пределах допустимого stale TTL
		if (age < staleTtlMs) {
			runBackgroundRevalidation(options);
			return cached.data;
		}
	}

	// 3. Кеша нет или он критически устарел — ждём выполнения fetcher (с дедупликацией)
	let inFlightPromise = memoryState.inFlight.get(key) as Promise<T> | undefined;
	if (!inFlightPromise) {
		inFlightPromise = (async () => {
			try {
				const freshData = await fetcher();
				writeSwrEntry(key, freshData, cacheDir);
				return freshData;
			} catch (error) {
				// Если есть хоть какой-то кеш на диске/в памяти — спасаем рендер
				if (cached) {
					console.warn(
						`[fileSwrCache] Ошибка загрузки ${key}, отдаём аварийный stale-кеш:`,
						error instanceof Error ? error.message : error,
					);
					return cached.data;
				}

				// Если есть fallback — возвращаем его
				if (fallback !== undefined) {
					console.warn(
						`[fileSwrCache] Ошибка загрузки ${key}, отдаём fallback:`,
						error instanceof Error ? error.message : error,
					);
					return fallback;
				}

				throw error;
			}
		})().finally(() => {
			memoryState.inFlight.delete(key);
		});

		memoryState.inFlight.set(key, inFlightPromise as Promise<unknown>);
	}

	return inFlightPromise;
};
