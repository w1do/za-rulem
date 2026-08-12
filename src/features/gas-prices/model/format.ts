import { getFuelName } from '../../../lib/gasStations';

export const formatPrice = (price: number | null | undefined): string =>
	price === null || price === undefined
		? 'Нет данных'
		: `${price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;

export const formatDelta = (delta: number | null): string => {
	if (delta === null) return 'Собираем историю';
	if (delta === 0) return 'Без изменений';
	const value = Math.abs(delta).toLocaleString('ru-RU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return `${delta > 0 ? 'Выросла' : 'Снизилась'} на ${value} ₽`;
};

export const formatFuelLabel = (fuelType: string): string => {
	const name = getFuelName(fuelType);
	return /^\d+$/.test(name) ? `АИ-${name}` : name;
};

export const formatGasDate = (value: string): string => {
	const normalized = value.includes('T') ? `${value.slice(0, 19)}Z` : `${value.slice(0, 10)}T00:00:00Z`;
	const date = new Date(normalized);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString('ru-RU', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'UTC',
		});
};

export const formatGasChartTime = (value: string): string => {
	const normalized = value.includes('T') ? `${value.slice(0, 19)}Z` : `${value.slice(0, 10)}T00:00:00Z`;
	const date = new Date(normalized);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'UTC',
		});
};
