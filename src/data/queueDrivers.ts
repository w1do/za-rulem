export type DriverStatus = 'free' | 'busy' | 'driving';

export interface QueueDriver {
	id: number;
	citySlug: string;
	name: string;
	gasStation: string;
	location: string;
	time: string;
	price: string;
	status: DriverStatus;
	phone: string;
	service: string;
}

const names = [
	'Алексей', 'Михаил', 'Сергей', 'Антон', 'Дмитрий', 'Илья', 'Максим', 'Андрей', 'Николай', 'Евгений',
	'Роман', 'Владимир', 'Константин', 'Павел', 'Виктор', 'Олег', 'Денис', 'Артём', 'Вадим', 'Станислав',
	'Георгий', 'Ярослав', 'Тимофей', 'Виталий', 'Григорий', 'Фёдор', 'Кирилл', 'Руслан', 'Леонид', 'Борис',
];

const gasStations = ['Лукойл', 'Газпромнефть', 'Роснефть', 'НТП', 'ТПК'];
const gasStationValues = ['lukoil', 'gazpromneft', 'rosneft', 'ntp', 'tpk'];

const locations = [
	'Тобольский тракт', 'Московский тракт', 'Червишевский тракт', 'Велижанский тракт',
	'Ялуторовский тракт', 'Старый Тобольский тракт', 'Салаирский тракт', 'Центр', 'Окружная дорога'
];

const times = ['С 4:00 утра', 'С 5:00 утра', 'С 6:00 утра', 'С 7:00 утра', 'Круглосуточно', 'Вечернее время'];
const timeValues = ['4am', '5am', '6am', '7am', '24h', 'evening'];

const statuses: DriverStatus[] = ['free', 'busy', 'driving'];

export const gasStationLabels: Record<string, string> = {
	lukoil: 'Лукойл',
	gazpromneft: 'Газпромнефть',
	rosneft: 'Роснефть',
	ntp: 'НТП',
	tpk: 'ТПК',
};

export const statusLabels: Record<DriverStatus, string> = {
	free: 'Сейчас свободен',
	busy: 'Сейчас занят',
	driving: 'На заказе',
};

export const queueDrivers: QueueDriver[] = Array.from({ length: 40 }).map((_, index) => {
	const name = names[index % names.length];
	const gasStationIdx = index % gasStations.length;
	const locationIdx = index % locations.length;
	const timeIdx = index % times.length;
	
	return {
		id: index + 1,
		citySlug: 'tyumen',
		name,
		gasStation: gasStationValues[gasStationIdx],
		location: locations[locationIdx],
		time: timeValues[timeIdx],
		price: `${800 + (index % 5) * 200}`.replace(/(\d)(?=(\d{3})+$)/g, '$1 '),
		status: statuses[index % statuses.length],
		phone: '+7 (922) ' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(10 + Math.random() * 90) + '-' + Math.floor(10 + Math.random() * 90),
		service: `Займу очередь на ${gasStations[gasStationIdx]}, ${locations[locationIdx]} ${times[timeIdx].toLowerCase()}`,
	};
});
