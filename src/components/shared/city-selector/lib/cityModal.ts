const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

interface CityModalElements {
	trigger: HTMLElement;
	modal: HTMLElement;
	dialog: HTMLElement;
	closeButton: HTMLElement | null;
	backdrop: HTMLElement | null;
	search: HTMLInputElement | null;
	options: HTMLElement[];
	empty: HTMLElement | null;
}

const normalize = (value: string): string => value.trim().toLowerCase().replace(/ё/g, 'е');

/** Показывает только города, подходящие под запрос, и сообщение о пустом результате. */
const filterOptions = ({ options, empty }: CityModalElements, query: string): void => {
	const search = normalize(query);
	let visible = 0;

	for (const option of options) {
		const haystack = `${option.dataset.cityName ?? ''} ${option.dataset.cityRegion ?? ''}`;
		const isMatch = !search || normalize(haystack).includes(search);
		option.hidden = !isMatch;
		if (isMatch) visible += 1;
	}

	if (empty) empty.hidden = visible > 0;
};

/**
 * Поведение модального окна: открытие, закрытие, блокировка прокрутки,
 * Esc, клик по подложке, фокус-ловушка и фильтрация списка.
 * Возвращает функцию отписки — она нужна при переходах между страницами.
 */
export const createCityModal = (elements: CityModalElements): (() => void) => {
	const { trigger, modal, dialog, closeButton, backdrop, search } = elements;
	let isOpen = false;

	const open = () => {
		if (isOpen) return;
		isOpen = true;
		modal.hidden = false;
		trigger.setAttribute('aria-expanded', 'true');
		document.body.style.overflow = 'hidden';
		(search ?? dialog).focus();
	};

	const close = () => {
		if (!isOpen) return;
		isOpen = false;
		modal.hidden = true;
		trigger.setAttribute('aria-expanded', 'false');
		document.body.style.overflow = '';
		trigger.focus();
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (!isOpen) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(element) => element.offsetParent !== null,
		);
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (event.shiftKey && (active === first || active === dialog)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	};

	const handleSearch = () => filterOptions(elements, search?.value ?? '');

	trigger.addEventListener('click', open);
	closeButton?.addEventListener('click', close);
	backdrop?.addEventListener('click', close);
	search?.addEventListener('input', handleSearch);
	document.addEventListener('keydown', handleKeydown);

	return () => {
		trigger.removeEventListener('click', open);
		closeButton?.removeEventListener('click', close);
		backdrop?.removeEventListener('click', close);
		search?.removeEventListener('input', handleSearch);
		document.removeEventListener('keydown', handleKeydown);
		document.body.style.overflow = '';
	};
};

export type { CityModalElements };
