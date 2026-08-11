import type { ChatCity } from '../lib/cities';

export type DriverStatus = 'free' | 'busy' | 'driving';

export interface FuelDriver {
	id: number;
	slug: string;
	citySlug: string;
	serviceSlug: string;
	name: string;
	district: string;
	districtSeo: string;
	deliveryTime: string;
	speed: 'fast' | 'wait';
	price: string;
	status: DriverStatus;
	fuels: string[];
	service: string;
	reason: string;
}

const names = [
	'Алексей', 'Михаил', 'Сергей', 'Антон', 'Дмитрий', 'Илья', 'Максим', 'Андрей', 'Николай', 'Евгений',
	'Роман', 'Владимир', 'Константин', 'Павел', 'Виктор', 'Олег', 'Денис', 'Артём', 'Вадим', 'Станислав',
	'Георгий', 'Ярослав', 'Тимофей', 'Виталий', 'Григорий', 'Фёдор', 'Кирилл', 'Руслан', 'Леонид', 'Борис',
];

const nameSlugs = [
	'aleksey', 'mihail', 'sergey', 'anton', 'dmitriy', 'ilya', 'maksim', 'andrey', 'nikolay', 'evgeniy',
	'roman', 'vladimir', 'konstantin', 'pavel', 'viktor', 'oleg', 'denis', 'artyom', 'vadim', 'stanislav',
	'georgiy', 'yaroslav', 'timofey', 'vitaliy', 'grigoriy', 'fyodor', 'kirill', 'ruslan', 'leonid', 'boris',
];

const districts = ['Центр', 'Северный район', 'Южный район', 'Восточная часть города', 'Западная часть города'];
const services = (city: ChatCity): string[] => [
	'Отстою очередь на заправке',
	'Привезу на дом бензин',
	'Доставка топлива на дом и дачу',
	`Доставка бензина ${city.byCity}`,
	'Доставка топлива за город',
];
const reasons = ['stalled', 'empty-tank', 'refueling', 'highway', 'country-trip'];
const fuelSets = [
	['ai92', 'ai98', 'ai100', 'dt'],
	['ai92', 'ai98'],
	['ai98', 'ai100'],
	['ai92', 'dt'],
	['ai100', 'dt'],
];
const statuses: DriverStatus[] = ['free', 'busy', 'driving'];

export const fuelLabels: Record<string, string> = {
	ai92: 'АИ-92',
	ai98: 'АИ-98',
	ai100: 'АИ-100',
	dt: 'Дизель',
};

export const statusLabels: Record<DriverStatus, string> = {
	free: 'Сейчас свободен',
	busy: 'Сейчас занят',
	driving: 'Едет на заказ',
};

export const getFuelDrivers = (city: ChatCity): FuelDriver[] => {
	const cityServices = services(city);

	return names.map((name, index) => {
		const fast = index % 3 !== 1;
		return {
			id: index + 1,
			slug: nameSlugs[index],
			citySlug: city.slug,
			serviceSlug: 'binzin',
			name,
			district: districts[index % districts.length],
			districtSeo: city.inCity,
			deliveryTime: fast ? (index % 2 === 0 ? 'от 1–2 часов' : 'от 2–3 часов') : 'от 2–5 часов',
			speed: fast ? 'fast' : 'wait',
			price: `${5_500 + (index % 6) * 500}`.replace(/(\d)(?=(\d{3})+$)/g, '$1 '),
			status: statuses[index % statuses.length],
			fuels: fuelSets[index % fuelSets.length],
			service: cityServices[index % cityServices.length],
			reason: reasons[index % reasons.length],
		};
	});
};

export const getFuelDriverPath = (driver: FuelDriver) =>
	`/drivers/${driver.citySlug}/${driver.serviceSlug}/${driver.slug}`;
