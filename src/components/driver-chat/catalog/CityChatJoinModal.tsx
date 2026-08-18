import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { persistPrefs, readPersistedChatPhone } from '../lib/chatPrefs';
import { isValidPhone, normalizePhone } from '../lib/phone';
import { searchCityChatOptions, type CityChatSearchOption } from './model';

interface CityChatJoinModalProps {
	cities: CityChatSearchOption[];
}

export default function CityChatJoinModal({ cities }: CityChatJoinModalProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const citiesBySlug = useMemo(() => new Map(cities.map((city) => [city.slug, city])), [cities]);
	const [query, setQuery] = useState('');
	const [selectedCity, setSelectedCity] = useState<CityChatSearchOption | null>(null);
	const [phone, setPhone] = useState('');
	const [error, setError] = useState('');
	const results = useMemo(() => searchCityChatOptions(cities, query), [cities, query]);
	const hasQuery = query.trim().length > 0;

	const openCity = useCallback((city: CityChatSearchOption) => {
		returnFocusRef.current = document.activeElement instanceof HTMLElement
			? document.activeElement
			: null;
		setSelectedCity(city);
		setPhone(readPersistedChatPhone());
		setError('');
	}, []);

	useEffect(() => {
		const handleOpen = (event: globalThis.MouseEvent) => {
			const target = event.target instanceof Element
				? event.target.closest<HTMLButtonElement>('[data-open-city-chat]')
				: null;
			if (!target) return;
			const city = citiesBySlug.get(target.dataset.citySlug ?? '');
			if (city) openCity(city);
		};

		document.addEventListener('click', handleOpen);
		return () => document.removeEventListener('click', handleOpen);
	}, [citiesBySlug, openCity]);

	useEffect(() => {
		if (!selectedCity) return;

		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setSelectedCity(null);
				return;
			}
			if (event.key !== 'Tab') return;

			const focusable = [...(modalRef.current?.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
			) ?? [])];
			const first = focusable[0];
			const last = focusable.at(-1);
			if (!first || !last) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', handleKeyDown);
		window.setTimeout(() => inputRef.current?.focus(), 0);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleKeyDown);
			returnFocusRef.current?.focus();
		};
	}, [selectedCity]);

	const close = () => {
		setSelectedCity(null);
		setError('');
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!selectedCity) return;

		const normalized = normalizePhone(phone);
		if (!isValidPhone(normalized)) {
			setError('Укажите российский номер из 11 цифр.');
			return;
		}

		const isSaved = persistPrefs({
			phone: normalized,
			topic: 'general',
			city: selectedCity.slug,
		});
		if (!isSaved) {
			setError('Браузер не разрешил сохранить вход. Разрешите локальное хранилище и повторите.');
			return;
		}

		window.location.assign(`/chat?city=${encodeURIComponent(selectedCity.slug)}&topic=general`);
	};

	return (
		<>
			<section className="city-chat-search bg-section" aria-labelledby="city-chat-search-title">
				<div className="container">
					<div className="row align-items-center">
						<div className="col-xl-5">
							<div className="section-title">
								<span className="section-sub-title">Полный справочник</span>
								<h2 id="city-chat-search-title">Найдите чат своего города</h2>
								<p>
									В карточках ниже показаны 10 городов с наиболее полным свежим срезом.
									Поиск доступен по всем {cities.length} опубликованным городам и регионам.
								</p>
							</div>
						</div>
						<div className="col-xl-7">
							<div className="contact-us-form city-chat-search__form">
								<label className="service-request-modal__label" htmlFor="city-chat-search-input">
									Город или регион
								</label>
								<div className="city-chat-search__field">
									<i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
									<input
										id="city-chat-search-input"
										className="form-control"
										type="search"
										value={query}
										onChange={(event) => setQuery(event.target.value)}
										placeholder="Например, Иркутск или Краснодарский край"
										autoComplete="off"
										aria-controls="city-chat-search-results"
									/>
								</div>

								<div id="city-chat-search-results" className="city-chat-search__results" aria-live="polite">
									{!hasQuery && (
										<p className="city-chat-search__notice">Начните вводить название — результаты появятся здесь.</p>
									)}
									{hasQuery && results.length === 0 && (
										<p className="city-chat-search__notice">Город не найден в опубликованном справочнике.</p>
									)}
									{results.map((city) => (
										<button key={city.slug} type="button" onClick={() => openCity(city)}>
											<span>
												<strong>{city.name}</strong>
												<small>{city.region}</small>
											</span>
											<span className="readmore-btn">Открыть чат</span>
										</button>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{selectedCity && (
				<div ref={modalRef} className="service-request-modal" role="dialog" aria-modal="true" aria-labelledby="city-chat-join-title">
					<button type="button" className="service-request-modal__backdrop" aria-label="Закрыть окно" onClick={close}></button>
					<div className="service-request-modal__dialog">
						<div className="service-request-modal__header">
							<div>
								<span className="service-request-modal__eyebrow">Чат водителей · {selectedCity.name}</span>
								<h2 id="city-chat-join-title">Укажите номер — и сразу в чат</h2>
								<p>SMS и пароль не нужны. Номер сохранится только на этом устройстве и станет подписью сообщений.</p>
							</div>
							<button type="button" className="service-request-modal__close" aria-label="Закрыть окно" onClick={close}>×</button>
						</div>

						<form onSubmit={handleSubmit} data-skip-service-request>
							<div className="form-group">
								<label className="service-request-modal__label" htmlFor="city-chat-phone">Номер телефона</label>
								<input
									ref={inputRef}
									id="city-chat-phone"
									className="form-control"
									type="tel"
									inputMode="tel"
									autoComplete="tel"
									placeholder="+7 999 000-00-00"
									value={phone}
									onChange={(event) => setPhone(event.target.value)}
									aria-describedby={error ? 'city-chat-phone-error' : 'city-chat-phone-hint'}
									required
								/>
								{error ? (
									<p id="city-chat-phone-error" className="city-chat-join__error" role="alert">{error}</p>
								) : (
									<p id="city-chat-phone-hint" className="city-chat-join__hint">Например, +7 999 000-00-00</p>
								)}
							</div>
							<div className="service-request-modal__actions">
								<button type="submit" className="btn-default city-chat-join__submit">Войти в чат {selectedCity.name}</button>
							</div>
							<small className="city-chat-join__privacy">
								Продолжая, вы принимаете <a href="/privacy-policy" data-skip-service-request>политику конфиденциальности</a>.
							</small>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
