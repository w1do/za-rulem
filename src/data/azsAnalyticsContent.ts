import type { ChatCity } from '../lib/cities';
import type { RankingKind } from '../features/gas-station-rankings';

export interface AzsRankingMeta {
	title: string;
	description: string;
	h1: string;
	shortTitle: string;
	subtitle: string;
	intro: string;
	chatTitle: string;
}

export const buildAzsRankingMeta = (
	city: ChatCity,
	kind: RankingKind,
): AzsRankingMeta => kind === 'cheapest'
	? {
		title: `Где дешёвый бензин ${city.inCity}: АЗС АИ-92, АИ-95, АИ-100, ДТ`,
		description: `Сравните самые дешёвые заправки ${city.inCity}: адреса АЗС, цены АИ-92, АИ-95, АИ-100 и ДТ, изменение за последний получасовой снимок.`,
		h1: `Самые дешёвые заправки ${city.inCity}`,
		shortTitle: 'Дешёвые заправки',
		subtitle: 'Где бензин дешевле',
		intro: `Рейтинг составлен отдельно для АИ-92, АИ-95, АИ-100 и дизельного топлива. В каждой карточке указан адрес АЗС, свежая цена и изменение относительно предыдущего получасового снимка.`,
		chatTitle: `Обсудить дешёвые АЗС ${city.inCity}`,
	}
	: {
		title: `Где дорогой бензин ${city.inCity}: АЗС АИ-92, АИ-95, АИ-100, ДТ`,
		description: `Сравните самые дорогие заправки ${city.inCity}: адреса АЗС, цены АИ-92, АИ-95, АИ-100 и ДТ, изменение за последний получасовой снимок.`,
		h1: `Самые дорогие заправки ${city.inCity}`,
		shortTitle: 'Дорогие заправки',
		subtitle: 'Где бензин дороже',
		intro: `Рейтинг показывает верхнюю часть ценового диапазона отдельно по каждой марке топлива. Проверяйте адрес, время обновления и изменение цены перед поездкой.`,
		chatTitle: `Обсудить дорогие АЗС ${city.inCity}`,
	};
