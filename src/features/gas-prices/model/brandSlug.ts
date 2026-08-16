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

/**
 * Родовые слова в названии точки 2GIS («АЗС», «заправочная станция») не являются
 * частью бренда и мешают собрать один slug для всей сети.
 */
const GENERIC_SUFFIX =
	/[\s,-]*(?:азс|азк|агзс|агнкс|автозаправочная станция|автозаправочный комплекс|заправочная станция|заправка)$/iu;

/**
 * Транслитерация даёт технически верный, но неанглийский slug («lukoyl», «gazoyl»).
 * Для известных сетей фиксируем принятое латинское написание бренда.
 */
const CANONICAL_BRAND_SLUGS: Record<string, string> = {
	лукойл: 'lukoil',
	lukoyl: 'lukoil',
	теболойл: 'teboil',
	газойл: 'gazoil',
	'калина-ойл': 'kalina-oil',
	'калина ойл': 'kalina-oil',
	топлайн: 'topline',
	флэш: 'flash',
	флеш: 'flash',
	ирбис: 'irbis',
	атан: 'atan',
	кондор: 'kondor',
	сигнал: 'signal',
	'нефтьмагистраль-ойл': 'neftmagistral-oil',
	газпромнефть: 'gazpromneft',
	'газпром нефть': 'gazpromneft',
};

/**
 * Единый английский slug сети: используется и как `stations.brand`,
 * и как `gas_daily.brand_slug`, поэтому вычисляется только здесь.
 */
export const canonicalBrandSlug = (value: string): string => {
	const cleaned = decodeSlug(value)
		.toLowerCase()
		.replaceAll('ё', 'е')
		.replace(/[«»"']/g, '')
		.replace(GENERIC_SUFFIX, '')
		.trim();
	if (!cleaned) return '';
	const canonical = CANONICAL_BRAND_SLUGS[cleaned] ?? CANONICAL_BRAND_SLUGS[toLatinBrandSlug(cleaned)];
	return canonical ?? toLatinBrandSlug(cleaned);
};

/** Astro отдаёт параметр маршрута percent-encoded, если пользователь пришёл по кириллическому URL. */
export const decodeSlug = (value: string): string => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};
