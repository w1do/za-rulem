import type { ChatTopic } from '../model/types';

export interface ChatChannel {
	id: ChatTopic;
	title: string;
	hint: string;
	icon: string;
	placeholder: string;
}

export const chatChannels: ChatChannel[] = [
	{
		id: 'general',
		title: 'Общий чат',
		hint: 'Где сейчас есть топливо',
		icon: 'fa-comments',
		placeholder: 'Например: где сейчас есть топливо в центре?',
	},
	{
		id: 'ai95',
		title: 'АИ-95',
		hint: 'Наличие и очереди',
		icon: 'fa-gas-pump',
		placeholder: 'Например: есть ли АИ-95 на Мельникайте?',
	},
	{
		id: 'ai92',
		title: 'АИ-92',
		hint: 'Наличие и очереди',
		icon: 'fa-gas-pump',
		placeholder: 'Например: где найти АИ-92 в Заречном?',
	},
	{
		id: 'ai100',
		title: 'АИ-100',
		hint: 'Наличие и очереди',
		icon: 'fa-gauge-high',
		placeholder: 'Например: где в наличии АИ-100?',
	},
	{
		id: 'dt',
		title: 'Дизель · ДТ',
		hint: 'Где заправить дизель по трассе',
		icon: 'fa-truck-moving',
		placeholder: 'Например: где заправить дизель по трассе?',
	},
	{
		id: 'queue',
		title: 'Очереди на АЗС',
		hint: 'Сколько сейчас ждать',
		icon: 'fa-clock',
		placeholder: 'Например: какая сейчас очередь на АЗС?',
	},
];

export const findChannel = (topic: ChatTopic): ChatChannel =>
	chatChannels.find((channel) => channel.id === topic) ?? chatChannels[0];
