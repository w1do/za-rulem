/**
 * Страницы, которые описывают сервис целиком и не имеют региональных версий.
 * Значения хранятся без начального слеша, чтобы их можно было сопоставлять
 * и с URL, и с первым сегментом маршрута.
 */
export const ROOT_ONLY_ROUTE_SEGMENTS = [
	'about',
	'chat',
	'chats',
	'contacts',
	'privacy-policy',
	'terms',
	'testimonials',
] as const;

/** Разделы, для которых городской префикс обязателен даже у базового города. */
export const CITY_PREFIX_REQUIRED_ROUTE_SEGMENTS = ['services', 'azs'] as const;

const rootOnlyRouteSegments: ReadonlySet<string> = new Set(ROOT_ONLY_ROUTE_SEGMENTS);
const cityPrefixRequiredRouteSegments: ReadonlySet<string> = new Set(
	CITY_PREFIX_REQUIRED_ROUTE_SEGMENTS,
);

const normalizePath = (path: string): string =>
	path.split(/[?#]/, 1)[0]?.replace(/^\/+|\/+$/g, '') ?? '';

/** Проверяет только точный маршрут: вложенные локальные разделы не затрагиваются. */
export const isRootOnlyRoute = (path: string): boolean =>
	rootOnlyRouteSegments.has(normalizePath(path));

/** Проверяет первый сегмент пути: правило действует на весь раздел и его дочерние страницы. */
export const isCityPrefixRequiredRoute = (path: string): boolean => {
	const [section] = normalizePath(path).split('/');
	return section !== undefined && cityPrefixRequiredRouteSegments.has(section);
};

/** Чистая URL-политика, отделённая от загрузки справочника Directus. */
export const buildCityUrl = (
	path: string,
	citySlug: string,
	defaultCitySlug: string,
): string => {
	const cleanPath = path.replace(/^\/+/, '');
	if (isRootOnlyRoute(cleanPath)) return `/${cleanPath}`;
	if (isCityPrefixRequiredRoute(cleanPath)) return `/${citySlug}/${cleanPath}`;
	if (citySlug === defaultCitySlug) return `/${cleanPath}`;
	return cleanPath ? `/${citySlug}/${cleanPath}` : `/${citySlug}`;
};
