import { useContactForm } from './useContactForm';

interface ContactFormProps {
	subject?: string;
}

/**
 * Форма страницы контактов (React-остров).
 * Разметка повторяет референс `source/contact.html` блок в блок:
 * поля в сетке `form-group col-md-6 mb-4`, отправка на вебхук n8n.
 */
export default function ContactForm({
	subject = 'Заявка со страницы контактов',
}: ContactFormProps) {
	const { values, status, error, handleChange, handleSubmit } = useContactForm(subject);

	return (
		<form id="contactForm" method="POST" onSubmit={handleSubmit} noValidate>
			<div className="row">
				<div className="form-group col-md-6 mb-4">
					<input
						type="text"
						name="fname"
						className="form-control"
						id="fname"
						placeholder="Имя"
						value={values.fname}
						onChange={handleChange}
					/>
					<div className="help-block with-errors"></div>
				</div>

				<div className="form-group col-md-6 mb-4">
					<input
						type="text"
						name="lname"
						className="form-control"
						id="lname"
						placeholder="Фамилия"
						value={values.lname}
						onChange={handleChange}
					/>
					<div className="help-block with-errors"></div>
				</div>

				<div className="form-group col-md-6 mb-4">
					<input
						type="email"
						name="email"
						className="form-control"
						id="email"
						placeholder="E-mail"
						value={values.email}
						onChange={handleChange}
					/>
					<div className="help-block with-errors"></div>
				</div>

				<div className="form-group col-md-6 mb-4">
					<input
						type="text"
						name="phone"
						className="form-control"
						id="phone"
						placeholder="Телефон"
						value={values.phone}
						onChange={handleChange}
						required
					/>
					<div className="help-block with-errors"></div>
				</div>

				<div className="form-group col-md-12 mb-5">
					<textarea
						name="message"
						className="form-control"
						id="message"
						rows={5}
						placeholder="Что случилось? Марка авто, адрес"
						value={values.message}
						onChange={handleChange}
					></textarea>
					<div className="help-block with-errors"></div>
				</div>

				<div className="col-md-12">
					<button type="submit" className="btn-default" disabled={status === 'loading'}>
						{status === 'loading' ? 'Отправляю…' : 'Отправить заявку'}
					</button>
					{status === 'success' && (
						<div id="msgSubmit" className="h3">
							Заявка отправлена! Перезвоню в течение пары минут.
						</div>
					)}
					{status === 'error' && (
						<div id="msgSubmit" className="h3">
							{error}
						</div>
					)}
				</div>
			</div>
		</form>
	);
}
