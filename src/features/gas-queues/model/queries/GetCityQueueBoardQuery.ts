/**
 * Query сводки очередей города.
 * Читает уже кешируемый состав АЗС города и превращает его в read-модель блока очередей.
 */

import { fetchCityGasStations } from '../../../../lib/gasStations.ts';
import { buildQueueBoard } from '../buildQueueBoard.ts';
import type { CityQueueBoard } from '../types.ts';

export const getCityQueueBoard = async (citySlug: string): Promise<CityQueueBoard> => {
	const stations = await fetchCityGasStations(citySlug);
	return buildQueueBoard(stations);
};
