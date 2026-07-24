import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { HELP_TYPES, useServiceRequestForm } from './useServiceRequestForm';

export const OPEN_EVENT = 'za-rulem:open-service-request';

export type OpenServiceRequestDetail = {
	service?: string;
	subject?: string;
	title?: string;
};

declare global {
	interface Window {
		openServiceRequest?: (detail?: OpenServiceRequestDetail) => void;
		__pendingServiceRequest?: OpenServiceRequestDetail | null;
	}
}

/**
 * Глобальная модалка заявки на выезд.
 * Открывается через window.openServiceRequest / custom event
 * (клики перехватывает inline-скрипт в Layout — до гидрации React).
 */
export default function ServiceRequestModal() {
	const titleId = useId();
	const [open, setOpen] = useState(false);
	const [heading, setHeading] = useState('Заявка на выезд');
	const [mounted, setMounted] = useState(false);
	const {
		values,
		status,
		error,
		geoStatus,
		handleChange,
		handleSubmit,
		detectLocation,
		reset,
		setSubject,
	} = useServiceRequestForm();

	const openModal = useCallback(
		(detail?: OpenServiceRequestDetail) => {
			const nextSubject = detail?.subject || 'Заявка на выезд — za-rulem';
			const nextTitle = detail?.title || 'Заявка на выезд';
			reset(nextSubject, detail?.service);
			setSubject(nextSubject);
			setHeading(nextTitle);
			setOpen(true);
		},
		[reset, setSubject],
	);

	const closeModal = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		window.openServiceRequest = (detail) => openModal(detail);

		const onCustomOpen = (event: Event) => {
			const custom = event as CustomEvent<OpenServiceRequestDetail>;
			openModal(custom.detail);
		};

		document.addEventListener(OPEN_EVENT, onCustomOpen as EventListener);

		// Заявка, кликнутая до гидрации React-острова.
		if (window.__pendingServiceRequest) {
			const pending = window.__pendingServiceRequest;
			window.__pendingServiceRequest = null;
			openModal(pending);
		}

		return () => {
			if (window.openServiceRequest) delete window.openServiceRequest;
			document.removeEventListener(OPEN_EVENT, onCustomOpen as EventListener);
		};
	}, [openModal]);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closeModal();
		};

		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.body.style.overflow = previous;
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open, closeModal]);

	if (!mounted || !open) return null;

	return createPortal(
		<div
			className="service-request-modal"
			data-service-request-modal
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
		>
			<button
				type="button"
				className="service-request-modal__backdrop"
				aria-label="Закрыть форму"
				onClick={closeModal}
			/>

			<div className="service-request-modal__dialog">
				<div className="service-request-modal__header">
					<div>
						<span className="service-request-modal__eyebrow">Универсальная заявка</span>
						<h2 id={titleId}>{heading}</h2>
						<p>
							Заполните геолокацию, тип помощи, телефон и данные авто — после этого я свяжусь и
							выеду.
						</p>
					</div>
					<button
						type="button"
						className="service-request-modal__close"
						aria-label="Закрыть"
						onClick={closeModal}
					>
						×
					</button>
				</div>

				{status === 'success' ? (
					<div className="service-request-modal__success">
						<p className="ajax-response success mb-3">
							Заявка отправлена. Первый освободившийся мастер перезвонит.
						</p>
						<div className="service-request-modal__actions">
							<button type="button" className="btn-default" onClick={closeModal}>
								Закрыть
							</button>
						</div>
					</div>
				) : (
					<form className="service-request-form" onSubmit={handleSubmit} noValidate>
						<div className="row">
							<div className="col-md-12">
								<div className="form-group">
									<label className="service-request-modal__label" htmlFor="sr-location">
										Точная геолокация / адрес *
									</label>
									<div className="service-request-modal__location-field">
										<input
											id="sr-location"
											type="text"
											name="location"
											className="form-control"
											placeholder="Адрес, ориентир или координаты"
											value={values.location}
											onChange={handleChange}
											required
										/>
          <button
											type="button"
											className="btn-default btn-highlighted service-request-modal__location-btn"
											onClick={detectLocation}
											disabled={geoStatus === 'loading'}
										>
											{geoStatus === 'loading' ? 'Определяю…' : 'Указать точное местоположение'}
										</button>
									</div>
								</div>
							</div>

							<div className="col-md-12">
								<div className="form-group">
									<label className="service-request-modal__label" htmlFor="sr-helpType">
										Какая помощь нужна *
									</label>
									<select
										id="sr-helpType"
										name="helpType"
										className="form-control"
										value={values.helpType}
										onChange={handleChange}
										required
									>
										<option value="">Выберите тип помощи</option>
										{HELP_TYPES.map((item) => (
											<option key={item.value} value={item.value}>
												{item.label}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="col-md-12">
								<div className="form-group">
									<label className="service-request-modal__label" htmlFor="sr-phone">
										Номер телефона *
									</label>
									<input
										id="sr-phone"
										type="tel"
										name="phone"
										className="form-control"
										placeholder="+7 ___ ___-__-__"
										value={values.phone}
										onChange={handleChange}
										required
									/>
								</div>
							</div>

							<div className="col-md-6">
								<div className="form-group">
									<label className="service-request-modal__label" htmlFor="sr-carBrand">
										Марка машины *
									</label>
									<input
										id="sr-carBrand"
										type="text"
										name="carBrand"
										className="form-control"
										placeholder="Например, Toyota Camry"
										value={values.carBrand}
										onChange={handleChange}
										required
									/>
								</div>
							</div>

							<div className="col-md-6">
								<div className="form-group">
									<label className="service-request-modal__label" htmlFor="sr-carNumber">
										Госномер *
									</label>
									<input
										id="sr-carNumber"
										type="text"
										name="carNumber"
										className="form-control"
										placeholder="А123ВС 72"
										value={values.carNumber}
										onChange={handleChange}
										required
									/>
								</div>
							</div>

							<div className="col-md-12">
								<div className="form-group">
									<label className="service-request-modal__label" htmlFor="sr-comment">
										Комментарий
									</label>
									<textarea
										id="sr-comment"
										name="comment"
										className="form-control"
										rows={3}
										placeholder="Что случилось, объем топлива, доп. детали"
										value={values.comment}
										onChange={handleChange}
									/>
								</div>
							</div>

							<div className="col-md-12">
								<div className="form-group mb-0 service-request-modal__actions">
									<button
										type="submit"
										className="btn-default btn-highlighted"
										disabled={status === 'loading'}
									>
										{status === 'loading' ? 'Отправляю…' : 'Отправить заявку'}
									</button>
									<button type="button" className="btn-default" onClick={closeModal}>
										Отмена
									</button>
								</div>
								{status === 'error' && error && (
									<div className="ajax-response error mt-3">{error}</div>
								)}
							</div>
						</div>
					</form>
				)}
			</div>
		</div>,
		document.body,
	);
}
