type Props = {
	city?: string;
	isPrepaymentPending?: boolean;
	error?: string;
	onPrepayment: () => void;
	onStayInQueue: () => void;
};

/**
 * Экран результата поиска: свободных курьеров нет, предлагаем предоплату для приоритетной очереди.
 */
export default function CourierUnavailableOffer({
	city,
	isPrepaymentPending = false,
	error,
	onPrepayment,
	onStayInQueue,
}: Props) {
	return (
		<div className="courier-offer">
			<div className="courier-offer__head">
				<span className="courier-offer__icon" aria-hidden="true">
					<i className="fa-solid fa-user-clock"></i>
				</span>
				<div>
					<strong>Курьер не найден</strong>
					<span>
						Сейчас по всем городам{city ? `, включая ${city},` : ''} курьеры заняты
					</span>
				</div>
			</div>

			<p className="courier-offer__text">
				Вы можете внести предоплату и сразу попадёте в очередь: как только ваша заявка будет
				обработана и бензин появится, к вам сразу приедет курьер и доставит топливо.
			</p>

			<div className="courier-offer__warning" role="alert">
				<strong>Внимание!</strong>
				<p>
					Ожидание от 1 до 5 дней — всё зависит от поставки, но вы 100% получите свой заказ, как
					только он будет в наличии. Клиенты, которые вносят предоплату, получают свой заказ
					в приоритете.
				</p>
			</div>

			{error && (
				<div className="alert alert-danger mb-4" role="alert" style={{ fontSize: '14px' }}>
					{error}
				</div>
			)}

			<div className="courier-offer__actions">
				<button
					type="button"
					className="btn-default btn-highlighted w-100"
					onClick={onPrepayment}
					disabled={isPrepaymentPending}
				>
					{isPrepaymentPending ? 'Готовим оплату...' : 'Внести предоплату — приоритетная очередь'}
				</button>
				<button
					type="button"
					className="courier-offer__secondary"
					onClick={onStayInQueue}
					disabled={isPrepaymentPending}
				>
					Остаться в общей очереди
				</button>
			</div>

			<style dangerouslySetInnerHTML={{ __html: `
				.courier-offer__head {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 14px;
					border-radius: 10px;
					background: #fff7ed;
					border: 1px solid #fed7aa;
				}
				.courier-offer__head strong {
					display: block;
					color: #431407;
					font-size: 16px;
				}
				.courier-offer__head span:not(.courier-offer__icon) {
					display: block;
					margin-top: 2px;
					color: #9a3412;
					font-size: 13px;
					line-height: 1.4;
				}
				.courier-offer__icon {
					flex: 0 0 auto;
					display: flex;
					align-items: center;
					justify-content: center;
					width: 40px;
					height: 40px;
					border-radius: 50%;
					background: #ffedd5;
					color: #c2410c;
				}
				.courier-offer__text {
					margin: 16px 0 0;
					color: #334155;
					font-size: 14px;
					line-height: 1.55;
				}
				.courier-offer__warning {
					margin-top: 16px;
					padding: 14px;
					border: 1px solid #F5B754;
					border-left: 4px solid #ea580c;
					border-radius: 10px;
					background: #fffaf0;
				}
				.courier-offer__warning strong {
					display: block;
					margin-bottom: 6px;
					color: #9a3412;
					font-size: 15px;
					text-transform: uppercase;
					letter-spacing: 0.03em;
				}
				.courier-offer__warning p {
					margin: 0;
					color: #431407;
					font-size: 13px;
					font-weight: 600;
					line-height: 1.5;
				}
				.courier-offer__actions {
					display: grid;
					gap: 8px;
					margin-top: 18px;
				}
				.courier-offer__secondary {
					padding: 10px;
					border: 1px solid #cbd5e1;
					border-radius: 8px;
					background: #fff;
					color: #475569;
					font-size: 14px;
					font-weight: 600;
					cursor: pointer;
					transition: background 0.2s ease, color 0.2s ease;
				}
				.courier-offer__secondary:hover:not(:disabled) {
					background: #f1f5f9;
					color: #0f172a;
				}
				.courier-offer__secondary:disabled,
				.courier-offer__actions .btn-default:disabled {
					opacity: 0.65;
					cursor: not-allowed;
				}
			`}} />
		</div>
	);
}
