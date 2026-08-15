import type { StationData } from '../../../lib/gasStations';
import { isStationDataFresh, matchesStationBrand } from '../../../lib/gasStations';

export type RoadGasBrandConfig = {
	name: string;
	aliases: string[];
};

export type RoadGasBrandCard = RoadGasBrandConfig & {
	summary: string;
	description: string;
};

type RoadGasBrandContext = {
	code: string;
	name: string;
	route: string;
};

export const buildRoadGasBrandCards = (
	brands: RoadGasBrandConfig[],
	road: RoadGasBrandContext,
): RoadGasBrandCard[] =>
	brands.map((brand) => {
		const aliases = [...new Set([brand.name, ...brand.aliases])];
		return {
			...brand,
			aliases,
			summary: `${brand.name} на ${road.code}: выберите сеть, чтобы увидеть её станции, адреса, топливо и свежие данные на карте.`,
			description: `На трассе ${road.code} «${road.name}» сеть ${brand.name} представлена в текущем справочнике АЗС по маршруту ${road.route}. Карточка объединяет свежие точки из единого реестра АЗС проекта в пределах 15 км от линии дороги. Нажмите «Показать на карте», чтобы оставить в списке станции ${brand.name} и проверить адреса, марки топлива, последние цены, ограничения отпуска и сведения об очередях. Данные меняются в течение дня, поэтому перед заездом откройте маркер нужной АЗС. Если обстановка непонятна, перейдите из popup в чат водителей: название станции, адрес и трасса уже будут добавлены в черновик сообщения.`,
		};
	});

export const countRoadBrandStations = (
	stations: StationData[],
	aliases: string[],
	now = Date.now(),
): number =>
	stations.filter(
		(station) => isStationDataFresh(station, now) && matchesStationBrand(station, aliases),
	).length;
