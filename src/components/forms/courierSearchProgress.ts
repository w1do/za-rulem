export const COURIER_SEARCH_START = 100;
export const COURIER_SEARCH_END = 30;
export const COURIER_SEARCH_DURATION_MS = 5000;

type CourierSearchStage = {
	readonly from: number;
	readonly text: string;
};

/** Этапы сканирования привязаны к значению счётчика, а не к таймеру. */
const STAGES: readonly CourierSearchStage[] = [
	{ from: 100, text: 'Поиск свободных курьеров в радиусе 10 км' },
	{ from: 80, text: 'Проверка баз партнёров и складов топлива' },
	{ from: 60, text: 'Опрос свободных экипажей' },
	{ from: 42, text: 'Уточнение сроков поставки' },
];

export function getStageText(counter: number): string {
	let stage = STAGES[0];
	for (const item of STAGES) {
		if (counter <= item.from) stage = item;
	}
	return stage.text;
}

export function getCounterAt(elapsedMs: number, durationMs = COURIER_SEARCH_DURATION_MS): number {
	if (durationMs <= 0) return COURIER_SEARCH_END;
	const ratio = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
	const span = COURIER_SEARCH_START - COURIER_SEARCH_END;
	return COURIER_SEARCH_START - Math.round(span * ratio);
}
