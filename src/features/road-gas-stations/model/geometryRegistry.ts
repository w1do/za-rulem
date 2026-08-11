import { parseRoadGeometry } from './geometry';
import type { RoadGeometry } from './types';

const geometryModules = import.meta.glob('./geometries/*.json', {
	eager: true,
	import: 'default',
});

const geometries = new Map<string, RoadGeometry>(
	Object.entries(geometryModules).map(([path, value]) => {
		const slug = path.split('/').at(-1)?.replace(/\.json$/, '');
		if (!slug) throw new Error(`Cannot resolve road slug from ${path}`);
		return [slug, parseRoadGeometry(value)];
	}),
);

export const getRoadGeometry = (slug: string): RoadGeometry | undefined => geometries.get(slug);

export const getRoadGeometrySlugs = (): string[] => [...geometries.keys()];
