/** Ключ и событие, по которым остальные острова узнают выбранный город. */
export const CITY_STORAGE_KEY = 'za-rulem-city';
export const CITY_CHANGE_EVENT = 'city-change';

const readCity = (): string | null => {
	try {
		return window.localStorage.getItem(CITY_STORAGE_KEY);
	} catch {
		return null;
	}
};

/** Сохраняет город и сообщает о смене остальным компонентам страницы. */
export const saveCity = (slug: string): void => {
	if (!slug || readCity() === slug) return;
	try {
		window.localStorage.setItem(CITY_STORAGE_KEY, slug);
	} catch {
		// Приватный режим — работаем без сохранения, событие всё равно нужно.
	}
	window.dispatchEvent(new CustomEvent(CITY_CHANGE_EVENT, { detail: slug }));
};

/** Город из адреса страницы важнее сохранённого: пользователь пришёл по ссылке. */
export const syncCityFromUrl = (knownSlugs: readonly string[]): void => {
	const [firstSegment] = window.location.pathname.split('/').filter(Boolean);
	if (firstSegment && knownSlugs.includes(firstSegment)) saveCity(firstSegment);
};
