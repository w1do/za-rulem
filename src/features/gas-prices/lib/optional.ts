/**
 * Цены — вспомогательный контент: недоступность Directus не должна ронять
 * страницу, поэтому запрос деградирует до пустого значения.
 */
export const optional = async <T>(
	operation: () => Promise<T>,
	fallback: T,
	label: string,
): Promise<T> => {
	try {
		return await operation();
	} catch (error) {
		console.error(`[gas-prices] ${label}:`, error instanceof Error ? error.message : error);
		return fallback;
	}
};
