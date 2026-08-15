/**
 * В индексе поисковых систем страницы сетей АЗС живут только по латинским URL,
 * поэтому кириллический slug из Directus транслитерируется перед публикацией.
 */
const CYRILLIC_MAP: Record<string, string> = {
	а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
	и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
	с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
	ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export const toLatinBrandSlug = (value: string): string => {
	const source = decodeSlug(value).trim().toLowerCase();
	let result = '';
	for (const char of source) result += CYRILLIC_MAP[char] ?? char;
	return result
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
};

/** Astro отдаёт параметр маршрута percent-encoded, если пользователь пришёл по кириллическому URL. */
export const decodeSlug = (value: string): string => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};
