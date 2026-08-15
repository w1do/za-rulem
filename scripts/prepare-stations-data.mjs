import { readFile, writeFile } from 'node:fs/promises';

const STATIONS_API_URL = 'https://benzin.api.2gis.ru/api/v1/stations';
const DIRECTUS_URL = 'https://api.za-rulem.org';
const CONCURRENCY = 5;

async function fetchJson(url) {
	const res = await fetch(url);
	if (!res.ok) {
		console.error(`[fetch] Failed: ${res.status} ${url}`);
		return null;
	}
	return res.json();
}

async function getCities() {
	console.log('Загрузка городов из Directus...');
	const payload = await fetchJson(`${DIRECTUS_URL}/items/cities?limit=-1&fields=slug,bounds_min_lat,bounds_max_lat,bounds_min_lon,bounds_max_lon&filter[status][_eq]=published`);
	if (!payload?.data) return [];
	return payload.data
		.filter(c => c.bounds_min_lat && c.bounds_max_lat)
		.map(c => ({
			type: 'city',
			slug: c.slug,
			bounds: {
				minLat: c.bounds_min_lat,
				maxLat: c.bounds_max_lat,
				minLon: c.bounds_min_lon,
				maxLon: c.bounds_max_lon
			}
		}));
}

async function getRoads() {
	console.log('Загрузка участков трасс из directus_road_segments.json...');
	try {
		const segments = JSON.parse(await readFile('directus_road_segments.json', 'utf8'));
		return segments
			.filter(s => s.bounds_min_lat && s.bounds_max_lat)
			.map(s => ({
				type: 'road',
				slug: s.slug,
				bounds: {
					minLat: s.bounds_min_lat,
					maxLat: s.bounds_max_lat,
					minLon: s.bounds_min_lon,
					maxLon: s.bounds_max_lon
				}
			}));
	} catch (e) {
		console.error('Не удалось прочитать directus_road_segments.json');
		return [];
	}
}

async function fetchStations(bounds) {
	const { minLat, maxLat, minLon, maxLon } = bounds;
	const url = `${STATIONS_API_URL}?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}`;
	return fetchJson(url);
}

async function run() {
	const cities = await getCities();
	const roads = await getRoads();
	const areas = [...cities, ...roads];
	
	console.log(`Всего областей для сканирования: ${areas.length}`);
	
	const allStations = new Map();
	
	for (let i = 0; i < areas.length; i += CONCURRENCY) {
		const batch = areas.slice(i, i + CONCURRENCY);
		console.log(`Обработка ${i + 1}-${Math.min(i + CONCURRENCY, areas.length)} / ${areas.length}...`);
		
		const results = await Promise.all(batch.map(a => fetchStations(a.bounds)));
		
		for (const stations of results) {
			if (!Array.isArray(stations)) continue;
			for (const item of stations) {
				if (!item.station?.id) continue;
				
				// Преобразуем в формат Directus коллекции 'stations'
				const { station, fuel_statuses, prices, status, closed, queue_level } = item;
				
				allStations.set(station.id, {
					id: station.id,
					status: 'published',
					name: station.name,
					brand: station.brand || '',
					address: station.address || '',
					lat: parseFloat(station.lat),
					lng: parseFloat(station.lng),
					fuel_assortment: station.fuel_assortment || [],
					fuel_statuses: fuel_statuses || [],
					prices: prices || [],
					last_transaction_at: station.last_transaction_at || new Date().toISOString(),
					closed: !!closed,
					queue_level: queue_level || 'UNKNOWN'
				});
			}
		}
	}
	
	const result = Array.from(allStations.values());
	console.log(`Найдено уникальных станций: ${result.length}`);
	
	await writeFile('stations_to_import.json', JSON.stringify(result, null, 2));
	console.log('Файл stations_to_import.json успешно создан.');
}

run().catch(console.error);
