import type { FuelCardBrand } from './types';

export const fuelCardBrandUrl = (brandSlug: string): string =>
	`/toplivnye-karty/${brandSlug}`;

export const selectRelatedFuelCardBrands = (
	brands: readonly FuelCardBrand[],
	currentSlug: string,
	limit = 3,
): FuelCardBrand[] => {
	const currentIndex = brands.findIndex((brand) => brand.slug === currentSlug);
	if (currentIndex < 0) return brands.slice(0, limit);

	return Array.from({ length: Math.min(limit, Math.max(0, brands.length - 1)) }, (_, offset) =>
		brands[(currentIndex + offset + 1) % brands.length],
	);
};
