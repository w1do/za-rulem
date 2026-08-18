/** Точная геопозиция клиента, полученная от браузера. */
export type GeoPoint = {
	lat: number;
	lng: number;
	accuracyM: number;
};

/** Местоположение заявки: город обязателен, координаты — при разрешённой геолокации. */
export type RequestLocation = {
	source: 'gps' | 'manual';
	city: string;
	address?: string;
	point?: GeoPoint;
};

export type GeoErrorCode = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class GeolocationRequestError extends Error {
	readonly code: GeoErrorCode;

	constructor(code: GeoErrorCode) {
		super(GEOLOCATION_ERROR_TEXT[code]);
		this.name = 'GeolocationRequestError';
		this.code = code;
	}
}

export const GEOLOCATION_ERROR_TEXT: Record<GeoErrorCode, string> = {
	unsupported: 'Браузер не поддерживает определение местоположения. Укажите город и адрес вручную.',
	denied: 'Доступ к геолокации запрещён. Разрешите доступ или укажите город и адрес вручную.',
	unavailable: 'Не удалось определить местоположение. Укажите город и адрес вручную.',
	timeout: 'Определение местоположения заняло слишком много времени. Попробуйте ещё раз или укажите адрес вручную.',
};

const GEOLOCATION_TIMEOUT_MS = 15_000;

export const isValidLat = (value: number): boolean => Number.isFinite(value) && Math.abs(value) <= 90;

export const isValidLng = (value: number): boolean => Number.isFinite(value) && Math.abs(value) <= 180;

/** Координаты в компактном человекочитаемом виде для оператора. */
export function formatCoordinates(point: GeoPoint): string {
	return `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
}

/** Заявку нельзя отправить без города; координаты обязательны только для gps-источника. */
export function isLocationReady(location: RequestLocation | null | undefined): boolean {
	if (!location) return false;
	if (!location.city.trim()) return false;
	if (location.source === 'manual') return Boolean(location.address?.trim());
	return Boolean(location.point && isValidLat(location.point.lat) && isValidLng(location.point.lng));
}

/** Строки местоположения для текста заявки. */
export function buildLocationLines(location: RequestLocation): string[] {
	const lines = [`Город: ${location.city.trim()}`];

	if (location.address?.trim()) {
		lines.push(`Адрес: ${location.address.trim()}`);
	}

	if (location.point) {
		lines.push(`Координаты: ${formatCoordinates(location.point)}`);
		lines.push(`Точность: ±${Math.round(location.point.accuracyM)} м`);
		lines.push(
			`Карта: https://yandex.ru/maps/?pt=${location.point.lng.toFixed(6)},${location.point.lat.toFixed(6)}&z=17&l=map`,
		);
	}

	lines.push(
		location.source === 'gps'
			? 'Источник местоположения: геолокация браузера'
			: 'Источник местоположения: указано клиентом вручную',
	);

	return lines;
}

/** Запрашивает точные координаты у браузера. */
export function requestBrowserPoint(): Promise<GeoPoint> {
	return new Promise((resolve, reject) => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			reject(new GeolocationRequestError('unsupported'));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : 0,
				});
			},
			(error) => {
				if (error.code === error.PERMISSION_DENIED) {
					reject(new GeolocationRequestError('denied'));
					return;
				}
				reject(new GeolocationRequestError(error.code === error.TIMEOUT ? 'timeout' : 'unavailable'));
			},
			{ enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 30_000 },
		);
	});
}

export type ReverseGeocodeResult = {
	city: string;
	address: string;
};

/** Определяет город и адрес по координатам через серверный прокси. */
export async function reverseGeocode(point: GeoPoint): Promise<ReverseGeocodeResult | null> {
	try {
		const res = await fetch('/api/geo/reverse', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ lat: point.lat, lng: point.lng }),
		});

		if (!res.ok) return null;

		const data: unknown = await res.json();
		if (typeof data !== 'object' || data === null) return null;

		const { city, address } = data as { city?: unknown; address?: unknown };
		if (typeof city !== 'string' || !city.trim()) return null;

		return {
			city: city.trim(),
			address: typeof address === 'string' ? address.trim() : '',
		};
	} catch {
		return null;
	}
}
