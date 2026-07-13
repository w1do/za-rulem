import { useCallbackForm } from './useCallbackForm';

interface CallbackFormProps {
	subject?: string;
	submitLabel?: string;
}

/**
 * Форма обратной заявки (React-остров).
 * Разметка использует классы дизайн-системы шаблона (form-group / form-control / btn-default).
 */
export default function CallbackForm({
	subject,
	submitLabel = 'Вызвать помощь',
}: CallbackFormProps) {
	const { values, status, error, handleChange, handleSubmit } = useCallbackForm(subject);

	return (
		<form className="callback-form" onSubmit={handleSubmit} noValidate>
			<div className="row">
				<div className="col-md-6">
					<div className="form-group">
						<input
							type="text"
							name="name"
							className="form-control"
							placeholder="Ваше имя"
							value={values.name}
							onChange={handleChange}
						/>
					</div>
				</div>
				<div className="col-md-6">
					<div className="form-group">
						<input
							type="tel"
							name="phone"
							className="form-control"
							placeholder="Телефон *"
							value={values.phone}
							onChange={handleChange}
							required
						/>
					</div>
				</div>
				<div className="col-md-12">
					<div className="form-group">
						<input
							type="email"
							name="email"
							className="form-control"
							placeholder="E-mail (необязательно)"
							value={values.email}
							onChange={handleChange}
						/>
					</div>
				</div>
				<div className="col-md-12">
					<div className="form-group">
						<textarea
							name="message"
							className="form-control"
							rows={3}
							placeholder="Что случилось? Марка авто, адрес"
							value={values.message}
							onChange={handleChange}
						/>
					</div>
				</div>
				<div className="col-md-12">
					<div className="form-group mb-0">
						<button
							type="submit"
							className="btn-default btn-highlighted"
							disabled={status === 'loading'}
						>
							{status === 'loading' ? 'Отправляю…' : submitLabel}
						</button>
					</div>

					{status === 'success' && (
						<div className="ajax-response success">
							Заявка отправлена! Перезвоню в течение пары минут.
						</div>
					)}
					{status === 'error' && <div className="ajax-response error">{error}</div>}
				</div>
			</div>
		</form>
	);
}
