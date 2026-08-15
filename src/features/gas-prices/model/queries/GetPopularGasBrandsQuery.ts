import type { GasBrand } from '../types';
import { loadGasBrands } from './brandRegistry';

export const getPopularGasBrands = async (): Promise<GasBrand[]> =>
	(await loadGasBrands())
		.filter((brand) => brand.isIndexable && brand.verificationStatus === 'verified')
		.sort((first, second) => first.name.localeCompare(second.name, 'ru'));
