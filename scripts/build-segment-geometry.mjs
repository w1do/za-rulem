/**
 * Дополняет `directus_road_segments.json` геометрией участков:
 * `sort`, `center`, `start_*`, `end_*`, `bounds_*`, `corridor_km`, `geometry`.
 *
 * Границы участка определяются по названию («Вязьма — Сафоново»): координаты городов
 * берутся из публичной коллекции `cities` в Directus, затем проецируются на полилинию трассы
 * из src/features/road-gas-stations/model/geometries/<route>.json (GeoJSON, [longitude, latitude]).
 *
 * Запуск: node scripts/build-segment-geometry.mjs [--items=directus_road_segments.json] [--corridor=5]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const GEOMETRY_DIRECTORY = 'src/features/road-gas-stations/model/geometries';
const COORDINATES_CACHE_PATH = 'scripts/data/segment-city-coords.json';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_DELAY_MS = 1100;
const KM_PER_LATITUDE_DEGREE = 111.32;
const MAXIMUM_CITY_OFFSET_KM = 60;
const DEFAULT_SEGMENT_KM = 15;

const args = process.argv.slice(2);
const readArgument = (name, fallback) => {
	const found = args.find((argument) => argument.startsWith(`--${name}=`));
	return found ? found.slice(name.length + 3) : fallback;
};

const itemsPath = readArgument('items', 'directus_road_segments.json');
const directusUrl = (readArgument('directus', process.env.DIRECTUS_URL || 'https://api.za-rulem.org')).replace(/\/$/, '');
const corridorKm = Number(readArgument('corridor', '5')) || 5;

const routeSlug = (routeCode) =>
	routeCode
		.toLowerCase()
		.replace(/[а-я]/g, (letter) => ({ а: 'a', м: 'm', р: 'r', е: 'e', к: 'k' })[letter] ?? letter)
		.replace(/\s+/g, '');

const normalizeName = (value) =>
	String(value || '')
		.toLocaleLowerCase('ru-RU')
		.replaceAll('ё', 'е')
		.replace(/[^a-zа-я0-9]+/gu, '');

const round = (value) => Number(value.toFixed(5));

const squareDistance = ([longitude, latitude], center) => {
	const deltaLon = (longitude - center.lon) * Math.cos((center.lat * Math.PI) / 180);
	const deltaLat = latitude - center.lat;
	return deltaLon * deltaLon + deltaLat * deltaLat;
};

const distanceKm = ([fromLon, fromLat], [toLon, toLat]) =>
	Math.hypot(
		(toLon - fromLon) * Math.cos((fromLat * Math.PI) / 180) * KM_PER_LATITUDE_DEGREE,
		(toLat - fromLat) * KM_PER_LATITUDE_DEGREE,
	);

const lineLengthKm = (points) =>
	points.reduce(
		(total, point, index) => (index === 0 ? 0 : total + distanceKm(points[index - 1], point)),
		0,
	);

/** Вырезает отрезок примерно нужной длины вокруг точки на полилинии. */
const sliceAround = (chain, index, halfLengthKm) => {
	let from = index;
	let to = index;
	let backwardKm = 0;
	let forwardKm = 0;

	while (from > 0 && backwardKm < halfLengthKm) {
		backwardKm += distanceKm(chain[from - 1], chain[from]);
		from -= 1;
	}
	while (to < chain.length - 1 && forwardKm < halfLengthKm) {
		forwardKm += distanceKm(chain[to], chain[to + 1]);
		to += 1;
	}

	return chain.slice(from, to + 1);
};

const snapToGeometry = (lines, center) => {
	let best = { lineIndex: 0, pointIndex: 0, distance: Number.POSITIVE_INFINITY };
	lines.forEach((line, lineIndex) => {
		line.forEach((point, pointIndex) => {
			const distance = squareDistance(point, center);
			if (distance < best.distance) best = { lineIndex, pointIndex, distance };
		});
	});
	return best;
};

/**
 * Выбирает цепочку трассы, ближайшую сразу к обоим городам участка.
 * Минимизация худшего из двух расстояний не даёт взять короткий городской way,
 * который случайно оказался рядом только с одним из концов участка.
 */
const pickSegmentChain = (chains, fromCenter, toCenter) => {
	let best = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const chain of chains) {
		if (chain.length < 2) continue;
		const distance = Math.max(
			snapToGeometry([chain], fromCenter).distance,
			snapToGeometry([chain], toCenter).distance,
		);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = chain;
		}
	}
	return best ?? [];
};

const padBounds = (points) => {
	const latitudes = points.map((point) => point[1]);
	const longitudes = points.map((point) => point[0]);
	const middleLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
	const latitudePadding = corridorKm / KM_PER_LATITUDE_DEGREE;
	const longitudePadding =
		corridorKm /
		(KM_PER_LATITUDE_DEGREE * Math.max(0.2, Math.cos((middleLatitude * Math.PI) / 180)));

	return {
		bounds_min_lat: round(Math.min(...latitudes) - latitudePadding),
		bounds_max_lat: round(Math.max(...latitudes) + latitudePadding),
		bounds_min_lon: round(Math.min(...longitudes) - longitudePadding),
		bounds_max_lon: round(Math.max(...longitudes) + longitudePadding),
	};
};

/** Прореживает полилинию, чтобы не хранить в Directus тысячи точек на участок. */
const simplify = (points, maximumPoints = 80) => {
	if (points.length <= maximumPoints) return points;
	const step = Math.ceil(points.length / maximumPoints);
	const result = points.filter((_, index) => index % step === 0);
	if (result.at(-1) !== points.at(-1)) result.push(points.at(-1));
	return result;
};

const loadCityCenters = async () => {
	const url = `${directusUrl}/items/cities?limit=-1&fields=slug,name,bounds_min_lat,bounds_max_lat,bounds_min_lon,bounds_max_lon`;
	const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
	if (!response.ok) throw new Error(`Cities request failed: ${response.status}`);
	const { data = [] } = await response.json();

	const centers = new Map();
	for (const city of data) {
		const lat = (Number(city.bounds_min_lat) + Number(city.bounds_max_lat)) / 2;
		const lon = (Number(city.bounds_min_lon) + Number(city.bounds_max_lon)) / 2;
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
		centers.set(normalizeName(city.name), { lat, lon });
		centers.set(normalizeName(city.slug), { lat, lon });
	}
	return centers;
};

/**
 * Геометрия трасс хранится как множество коротких OSM-way без общего порядка.
 * Сшиваем их по совпадающим концам в непрерывные цепочки и берём самую длинную.
 */
const stitchLines = (lines) => {
	const key = ([longitude, latitude]) => `${longitude.toFixed(6)}:${latitude.toFixed(6)}`;
	const remaining = lines.filter((line) => Array.isArray(line) && line.length >= 2);
	const byEndpoint = new Map();
	remaining.forEach((line, index) => {
		[key(line[0]), key(line.at(-1))].forEach((endpoint) => {
			byEndpoint.set(endpoint, [...(byEndpoint.get(endpoint) ?? []), index]);
		});
	});

	const used = new Set();
	const takeNext = (endpoint) => {
		for (const index of byEndpoint.get(endpoint) ?? []) {
			if (used.has(index)) continue;
			used.add(index);
			const line = remaining[index];
			return key(line[0]) === endpoint ? line : [...line].reverse();
		}
		return null;
	};

	const chains = [];
	remaining.forEach((line, index) => {
		if (used.has(index)) return;
		used.add(index);
		const chain = [...line];

		for (;;) {
			const next = takeNext(key(chain.at(-1)));
			if (!next) break;
			chain.push(...next.slice(1));
		}
		for (;;) {
			const previous = takeNext(key(chain[0]));
			if (!previous) break;
			chain.unshift(...[...previous].reverse().slice(0, -1));
		}

		chains.push(chain);
	});

	return chains.sort((first, second) => second.length - first.length);
};

const cacheCoordinates = new Map(
	Object.entries(
		JSON.parse(await readFile(resolve(COORDINATES_CACHE_PATH), 'utf8').catch(() => '{}')),
	),
);
let isCacheDirty = false;

const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

/** Догеокодирует небольшие населённые пункты, которых нет в коллекции `cities`. */
const geocodeCity = async (name) => {
	const cacheKey = normalizeName(name);
	if (cacheCoordinates.has(cacheKey)) return cacheCoordinates.get(cacheKey);

	const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=ru&q=${encodeURIComponent(name)}`;
	try {
		await delay(NOMINATIM_DELAY_MS);
		const response = await fetch(url, {
			headers: { 'User-Agent': 'za-rulem-road-segments/1.0 (build script)' },
			signal: AbortSignal.timeout(30_000),
		});
		if (!response.ok) throw new Error(String(response.status));
		const [place] = await response.json();
		const center = place ? { lat: Number(place.lat), lon: Number(place.lon) } : null;
		cacheCoordinates.set(cacheKey, center);
		isCacheDirty = true;
		return center;
	} catch (error) {
		console.warn(`Геокодирование не удалось для ${name}: ${error instanceof Error ? error.message : error}`);
		return null;
	}
};

/** Записывает в участок все производные поля геометрии. */
const applySegmentGeometry = (segment, sort, slice) => {
	const middle =
		slice.length > 2
			? slice[Math.floor(slice.length / 2)]
			: [(slice[0][0] + slice[1][0]) / 2, (slice[0][1] + slice[1][1]) / 2];

	segment.sort = sort;
	segment.center = { lat: round(middle[1]), lon: round(middle[0]) };
	segment.start_lat = round(slice[0][1]);
	segment.start_lon = round(slice[0][0]);
	segment.end_lat = round(slice.at(-1)[1]);
	segment.end_lon = round(slice.at(-1)[0]);
	segment.corridor_km = corridorKm;
	segment.geometry = simplify(slice).map(([longitude, latitude]) => [
		round(longitude),
		round(latitude),
	]);
	Object.assign(segment, padBounds(slice));
};

/** «Вязьма — Сафоново» → [«Вязьма», «Сафоново»]. */
const splitSegmentName = (name) =>
	String(name || '')
		.split(/\s[—–]\s|—|–/)
		.map((part) => part.trim())
		.filter(Boolean);

const cityCenters = await loadCityCenters();
const segments = JSON.parse(await readFile(resolve(itemsPath), 'utf8'));

const byRoute = new Map();
segments.forEach((segment) => {
	byRoute.set(segment.route_code, [...(byRoute.get(segment.route_code) ?? []), segment]);
});

let enriched = 0;
const withoutGeometry = [];
const withoutCities = [];

for (const [routeCode, routeSegments] of byRoute) {
	const slug = routeSlug(routeCode);
	let geometry;
	try {
		geometry = JSON.parse(await readFile(resolve(GEOMETRY_DIRECTORY, `${slug}.json`), 'utf8'));
	} catch {
		withoutGeometry.push(`${routeCode} (${slug}.json)`);
		continue;
	}

	const chains = stitchLines(geometry.coordinates ?? []);
	if (chains.length === 0) {
		withoutGeometry.push(`${routeCode} (пустая геометрия)`);
		continue;
	}

	let index = 0;
	for (const segment of routeSegments) {
		index += 1;
		const [fromName, toName] = splitSegmentName(segment.name);
		const fromCenter =
			cityCenters.get(normalizeName(fromName)) ??
			cityCenters.get(normalizeName(segment.city_slug)) ??
			(await geocodeCity(`${fromName}, Россия`));
		const toCenter =
			cityCenters.get(normalizeName(toName)) ??
			(toName ? await geocodeCity(`${toName}, Россия`) : null) ??
			fromCenter;

		if (!fromCenter || !toCenter) {
			withoutCities.push(segment.slug);
			continue;
		}

		// Цепочка участка должна проходить рядом с обоими городами, иначе линия схлопывается
		// в короткий кусок дороги внутри одного города.
		const chain = pickSegmentChain(chains, fromCenter, toCenter);
		if (chain.length < 2) continue;

		// Тёзки городов (Зеленогорск, Ростов) дают координаты в другом регионе:
		// принимаем только точки, лежащие рядом с самой трассой.
		const nearRoute = (center) =>
			Math.sqrt(snapToGeometry([chain], center).distance) * KM_PER_LATITUDE_DEGREE <=
			MAXIMUM_CITY_OFFSET_KM;
		const isFromValid = nearRoute(fromCenter);
		const isToValid = nearRoute(toCenter);
		if (!isFromValid && !isToValid) {
			// Ни одна цепочка не покрывает оба города (геометрия трассы разорвана),
			// но сами города лежат у трассы — рисуем прямую между ними.
			const nearAnyChain = (center) =>
				Math.sqrt(snapToGeometry(chains, center).distance) * KM_PER_LATITUDE_DEGREE <=
				MAXIMUM_CITY_OFFSET_KM;
			if (nearAnyChain(fromCenter) && nearAnyChain(toCenter)) {
				applySegmentGeometry(segment, index, [
					[fromCenter.lon, fromCenter.lat],
					[toCenter.lon, toCenter.lat],
				]);
				enriched += 1;
				continue;
			}
			withoutCities.push(segment.slug);
			continue;
		}

		const fromIndex = snapToGeometry([chain], fromCenter).pointIndex;
		const toIndex = snapToGeometry([chain], toCenter).pointIndex;
		const from = Math.min(fromIndex, toIndex);
		const to = Math.max(fromIndex, toIndex);
		let slice;
		if (!isFromValid || !isToValid) {
			slice = sliceAround(chain, isFromValid ? fromIndex : toIndex, DEFAULT_SEGMENT_KM / 2);
		} else {
			slice =
				to - from >= 1
					? chain.slice(from, to + 1)
					: chain.slice(Math.max(0, from - 2), Math.min(chain.length, from + 3));
		}
		if (slice.length < 2) continue;
		if (!isFromValid || !isToValid) {
			applySegmentGeometry(segment, index, slice);
			enriched += 1;
			continue;
		}

		// Геометрия трасс в OSM разорвана на короткие way: выбранная цепочка может целиком
		// лежать внутри одного города, и вырезанный отрезок схлопывается почти в точку.
		// В этом случае показываем прямую между городами — это честная длина участка.
		const directKm = distanceKm(
			[fromCenter.lon, fromCenter.lat],
			[toCenter.lon, toCenter.lat],
		);
		const sliceKm = lineLengthKm(slice);
		if (directKm > 1 && (sliceKm < directKm * 0.5 || sliceKm > directKm * 3)) {
			const projected = [chain[fromIndex], chain[toIndex]];
			slice =
				distanceKm(projected[0], projected[1]) >= directKm * 0.5
					? projected
					: [
							[fromCenter.lon, fromCenter.lat],
							[toCenter.lon, toCenter.lat],
						];
		}

		// Совсем короткий отрезок бесполезен для карты: показываем стандартные 15 км трассы.
		if (lineLengthKm(slice) < DEFAULT_SEGMENT_KM / 3) {
			slice = sliceAround(chain, fromIndex, DEFAULT_SEGMENT_KM / 2);
			if (slice.length < 2) continue;
		}

		// Итоговая проверка: участок не может быть кратно короче расстояния между его городами.
		if (directKm > 1 && lineLengthKm(slice) < directKm * 0.5) {
			slice = [
				[fromCenter.lon, fromCenter.lat],
				[toCenter.lon, toCenter.lat],
			];
		}

		applySegmentGeometry(segment, index, slice);
		enriched += 1;
	}
}

await writeFile(resolve(itemsPath), `${JSON.stringify(segments, null, 2)}\n`, 'utf8');

if (isCacheDirty) {
	await mkdir(resolve('scripts/data'), { recursive: true });
	await writeFile(
		resolve(COORDINATES_CACHE_PATH),
		`${JSON.stringify(Object.fromEntries(cacheCoordinates), null, 2)}\n`,
		'utf8',
	);
}

console.log(`Обновлено участков: ${enriched} из ${segments.length}`);
if (withoutGeometry.length > 0) console.log(`Нет геометрии трассы: ${withoutGeometry.join(', ')}`);
if (withoutCities.length > 0) console.log(`Не найдены города: ${withoutCities.join(', ')}`);
