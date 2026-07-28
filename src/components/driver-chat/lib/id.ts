/** Идентификатор для сессии и оптимистичных сообщений. */
export const createId = (): string => {
	try {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
	} catch {
		// Старые браузеры и небезопасный контекст — уходим на запасной вариант.
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
