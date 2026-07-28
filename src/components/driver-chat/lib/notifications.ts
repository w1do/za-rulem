const isNotificationSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;

/** Спрашиваем разрешение один раз — только если пользователь ещё не решил. */
export const requestNotificationPermission = (): void => {
	if (!isNotificationSupported() || Notification.permission !== 'default') return;
	Notification.requestPermission().catch(() => {});
};

/**
 * Пуш-уведомление о новом сообщении, когда вкладка/PWA свёрнута.
 * Работает через Notification API, пока страница запущена (соединение живо).
 */
export const notifyNewMessage = (text: string): void => {
	if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
	if (!isNotificationSupported() || Notification.permission !== 'granted') return;
	try {
		new Notification('Чат водителей', {
			body: text,
			icon: '/images/logo.svg',
			// Новые уведомления заменяют предыдущие, чтобы не копить стопку.
			tag: 'driver-chat',
		});
	} catch {
		// iOS и часть браузеров не поддерживают конструктор Notification — молча пропускаем.
	}
};
