/** Строка без пробелов по краям; для любого другого типа — пустая строка. */
export const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Конечное число из числа или строки; иначе null. */
export const toNumber = (value: unknown): number | null => {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
	return Number.isFinite(parsed) ? parsed : null;
};
