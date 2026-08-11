// Справочник городов и видов топлива для кластера «Чат водителей».
// Используется посадочными страницами /chat-voditeley/... и самим чатом
// для привязки диалогов к городам.

export interface ChatFuel {
	/** Слаг в URL и topic диалога чата. */
	slug: string;
	/** Короткое название: АИ-95, ДТ. */
	name: string;
	/** Полное название для заголовков. */
	title: string;
	/** Иконка FontAwesome. */
	icon: string;
}

export const chatFuels: ChatFuel[] = [
	{ slug: 'ai92', name: 'АИ-92', title: 'Бензин АИ-92', icon: 'fa-gas-pump' },
	{ slug: 'ai95', name: 'АИ-95', title: 'Бензин АИ-95', icon: 'fa-gas-pump' },
	{ slug: 'ai100', name: 'АИ-100', title: 'Бензин АИ-100', icon: 'fa-gauge-high' },
	{ slug: 'dt', name: 'ДТ', title: 'Дизельное топливо', icon: 'fa-truck-moving' },
];

export const getFuel = (slug: string) => chatFuels.find((f) => f.slug === slug);
