import { toNumber } from './parse';

// process.env читается в рантайме: PUBLIC_* вшивается в бандл на сборке и не даёт менять адрес без пересборки.
export const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ??
	process.env.PUBLIC_DIRECTUS_URL ??
	import.meta.env.PUBLIC_DIRECTUS_URL ??
	'https://api.za-rulem.org'
).replace(/\/$/, '');

/** Запрос к Directus не должен блокировать рендер дольше этого времени. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Сколько кеш городов считается свежим; 0 отключает кеширование. */
export const CACHE_TTL_MS = toNumber(process.env.CITIES_CACHE_TTL_MS) ?? 10 * 60 * 1000;
