const PHONE_DIGITS = 11;

export const normalizePhone = (value: string): string => {
	let digits = value.replace(/\D/g, '');
	// Для РФ: если 10 цифр и начинается с 9, добавляем 7
	if (digits.length === 10 && digits[0] === '9') {
		digits = `7${digits}`;
	}
	digits = digits.slice(0, PHONE_DIGITS);
	if (!digits) return '';
	const normalized = digits[0] === '8' ? `7${digits.slice(1)}` : digits;
	return `+${normalized}`;
};

export const isValidPhone = (value: string): boolean => value.replace(/\D/g, '').length === PHONE_DIGITS;
