import { parseRoadGeometry } from './geometry';
import type { RoadGeometry } from './types';

const geometryLoaders = import.meta.glob('./geometries/*.json', { import: 'default' });

export const loadRoadGeometry = async (slug: string): Promise<RoadGeometry> => {
	const loader = geometryLoaders[`./geometries/${slug}.json`];
	if (!loader) throw new Error('Геометрия трассы не найдена');
	return parseRoadGeometry(await loader());
};
