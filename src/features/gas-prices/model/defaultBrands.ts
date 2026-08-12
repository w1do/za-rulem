import type { GasBrand } from './types.ts';

/**
 * Минимальный проверенный реестр поддерживает страницы до настройки Directus.
 * Directus может расширять и переопределять его без деплоя.
 */
export const DEFAULT_GAS_BRANDS: readonly GasBrand[] = [
	{
		slug: 'gazprom',
		name: 'Газпромнефть',
		aliases: ['Газпромнефть', 'Газпром нефть'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'lukoil',
		name: 'Лукойл',
		aliases: ['Лукойл', 'Lukoil'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'rosneft',
		name: 'Роснефть',
		aliases: ['Роснефть'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'tatneft',
		name: 'Татнефть',
		aliases: ['Татнефть'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'signal',
		name: 'Signal',
		aliases: ['Signal', 'Сигнал'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'bashneft',
		name: 'Башнефть',
		aliases: ['Башнефть'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'surgutneftegaz',
		name: 'Сургутнефтегаз',
		aliases: ['Сургутнефтегаз'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'tpk',
		name: 'ТПК',
		aliases: ['ТПК'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'n-1',
		name: 'Н-1',
		aliases: ['Н-1', 'N-1'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	{
		slug: 'kondor',
		name: 'Кондор',
		aliases: ['Кондор', 'Kondor'],
		isIndexable: true,
		verificationStatus: 'verified',
	},
] as const;
