import { getCityUrl } from '../../../lib/cities';

export const gasPricesUrl = (citySlug: string, brandSlug?: string): string =>
	getCityUrl(`/ceny-na-benzin${brandSlug ? `/${brandSlug}` : ''}`, citySlug);
