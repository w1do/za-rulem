import assert from 'node:assert/strict';
import test from 'node:test';
import {
	fuelCardBrandUrl,
	selectRelatedFuelCardBrands,
} from '../src/features/fuel-cards/model/brands.ts';

const brands = [
	{ slug: 'gazprom', name: 'Газпромнефть' },
	{ slug: 'lukoil', name: 'Лукойл' },
	{ slug: 'rosneft', name: 'Роснефть' },
	{ slug: 'tatneft', name: 'Татнефть' },
];

test('строит канонический URL брендовой страницы', () => {
	assert.equal(fuelCardBrandUrl('lukoil'), '/toplivnye-karty/lukoil');
});

test('выбирает соседние бренды по кругу и исключает текущий', () => {
	assert.deepEqual(
		selectRelatedFuelCardBrands(brands, 'tatneft', 3),
		[brands[0], brands[1], brands[2]],
	);
});
