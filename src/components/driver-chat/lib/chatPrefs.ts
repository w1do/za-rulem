import { isChatTopic, type ChatTopic } from '../model/types';
import { isValidPhone, normalizePhone } from './phone';

const STORAGE_KEY = 'za-rulem-driver-chat';
const CITY_STORAGE_KEY = 'za-rulem-city';

export interface ChatPrefs {
	phone: string;
	topic: ChatTopic;
	city: string;
}

// Справочник городов живёт на сервере, поэтому в браузере проверяем только форму слага.
const CITY_SLUG_PATTERN = /^[a-z0-9-]{2,50}$/;

export const isKnownCity = (slug: unknown): slug is string =>
	typeof slug === 'string' && CITY_SLUG_PATTERN.test(slug);

export const resolveCity = (slug: unknown, defaultCitySlug: string): string =>
	isKnownCity(slug) ? slug : defaultCitySlug;

const readStoredPrefs = (): Partial<ChatPrefs> => {
	const saved = window.localStorage.getItem(STORAGE_KEY);
	if (!saved) return {};
	try {
		return JSON.parse(saved) as Partial<ChatPrefs>;
	} catch {
		window.localStorage.removeItem(STORAGE_KEY);
		return {};
	}
};

const readUrlPrefs = (): Partial<ChatPrefs> => {
	const params = new URLSearchParams(window.location.search);
	const prefs: Partial<ChatPrefs> = {};

	const urlTopic = params.get('topic');
	if (isChatTopic(urlTopic)) prefs.topic = urlTopic;

	const urlCity = params.get('city');
	if (isKnownCity(urlCity)) prefs.city = urlCity;

	const urlPhone = params.get('phone');
	if (urlPhone) {
		const normalized = normalizePhone(urlPhone);
		if (isValidPhone(normalized)) prefs.phone = normalized;
	}

	return prefs;
};

/**
 * Начальные настройки чата. Приоритет: URL → глобальный город → сохранённый конфиг чата.
 */
export const readInitialPrefs = (defaultCitySlug: string): ChatPrefs => {
	const globalCity = window.localStorage.getItem(CITY_STORAGE_KEY);
	const stored = readStoredPrefs();
	const url = readUrlPrefs();

	return {
		phone: url.phone ?? (typeof stored.phone === 'string' ? stored.phone : ''),
		topic: url.topic ?? (isChatTopic(stored.topic) ? stored.topic : 'general'),
		city: url.city ?? (isKnownCity(globalCity) ? globalCity : resolveCity(stored.city, defaultCitySlug)),
	};
};

export const persistPrefs = ({ phone, topic, city }: ChatPrefs): void => {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ phone, topic, city }));
		window.localStorage.setItem(CITY_STORAGE_KEY, city);
	} catch (e) {
		console.warn('Chat persistence failed:', e);
	}
};

export const persistCity = (city: string): void => {
	try {
		window.localStorage.setItem(CITY_STORAGE_KEY, city);
	} catch {
		// Приватный режим — просто работаем без сохранения.
	}
};

/**
 * Держим query-параметры страницы в актуальном состоянии: иначе после
 * перезагрузки старый ?city= из URL перекроет выбранный город.
 */
export const syncUrlPrefs = (topic: ChatTopic, city: string): void => {
	if (typeof window === 'undefined' || !window.history?.replaceState) return;
	try {
		const url = new URL(window.location.href);
		if (!url.searchParams.has('city') && !url.searchParams.has('topic')) return;
		if (url.searchParams.has('city')) url.searchParams.set('city', city);
		if (url.searchParams.has('topic')) url.searchParams.set('topic', topic);
		window.history.replaceState(window.history.state, '', url.toString());
	} catch (e) {
		console.warn('Chat URL sync failed:', e);
	}
};

/** Внешние источники смены города: селектор в шапке (событие) и другие вкладки (storage). */
export const subscribeToCityChange = (onCityChange: (city: string) => void): (() => void) => {
	const handleCityEvent = (event: Event) => {
		const detail = (event as CustomEvent<string>).detail;
		if (detail) onCityChange(detail);
	};
	const handleStorage = (event: StorageEvent) => {
		if (event.key === CITY_STORAGE_KEY && event.newValue) onCityChange(event.newValue);
	};

	window.addEventListener('city-change', handleCityEvent);
	window.addEventListener('storage', handleStorage);

	return () => {
		window.removeEventListener('city-change', handleCityEvent);
		window.removeEventListener('storage', handleStorage);
	};
};
