import { useCallback, useEffect, useId, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import CourierSearchSimulation from './CourierSearchSimulation';
import CourierUnavailableOffer from './CourierUnavailableOffer';
import RequestLocationField from './RequestLocationField';
import { isLocationReady, type RequestLocation } from '../../lib/geo/requestLocation';
import {
	LEADS_ENDPOINT,
	buildCourierRequestLead,
	type PrepaymentStatus,
} from '../../lib/leads/courierRequestLead';

export const VOICE_OPEN_EVENT = 'za-rulem:open-voice-request';
export const SERVICE_OPEN_EVENT = 'za-rulem:open-service-request';

export type OpenVoiceRequestDetail = {
	service?: string;
	subject?: string;
	title?: string;
	city?: string;
};

/**
 * Модальное окно для голосовой заявки.
 * Человек записывает голос -> Polza AI транскрибирует -> Человек проверяет и отправляет.
 */
export default function VoiceRequestModal() {
	const titleId = useId();
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [courierInfoOpen, setCourierInfoOpen] = useState(false);

	const [heading, setHeading] = useState('Как вам удобнее?');
	const [subject, setSubject] = useState('Голосовая заявка — za-rulem');
	const [service, setService] = useState<string | undefined>();
	const [city, setCity] = useState<string | undefined>();

	const [status, setStatus] = useState<
		| 'idle'
		| 'recording'
		| 'transcribing'
		| 'reviewing'
		| 'submitting'
		| 'searching_courier'
		| 'courier_not_found'
		| 'success'
		| 'error'
	>('idle');
	const [queueMode, setQueueMode] = useState<'standard' | 'priority'>('standard');
	const [isPrepaymentPending, setIsPrepaymentPending] = useState(false);
	const [transcription, setTranscription] = useState('');
	const [phone, setPhone] = useState('');
	const [location, setLocation] = useState<RequestLocation | null>(null);
	const [error, setError] = useState('');
	const [recordingTime, setRecordingTime] = useState(0);
	const isCarSelection = service === 'vladivostok-car-selection';
	const isPartsSelection = service === 'vladivostok-contract-parts';
	const isPartnerApplication = service === 'partner-fuel-courier';
	const isFuelCardRequest = service?.startsWith('fuel-card-') === true;
	const showFuelDeliveryLoadAlert = service === undefined || service === 'toplivo';

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const startTimeRef = useRef<number>(0);
	const timerRef = useRef<number | null>(null);

	const openModal = useCallback((detail?: OpenVoiceRequestDetail) => {
		setHeading(detail?.title || 'Как вам удобнее?');
		setSubject(detail?.subject || 'Голосовая заявка — za-rulem');
		setService(detail?.service);
		setCity(detail?.city);
		setStatus('idle');
		setTranscription('');
		setPhone('');
		setLocation(null);
		setError('');
		setQueueMode('standard');
		setIsPrepaymentPending(false);
		setCourierInfoOpen(false);
		setOpen(true);
	}, []);

	const closeModal = useCallback(() => {
		setOpen(false);
		setCourierInfoOpen(false);
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
			mediaRecorderRef.current.stop();
		}
	}, []);

	useEffect(() => {
		setMounted(true);
		
		const onOpen = (event: Event) => {
			const custom = event as CustomEvent<OpenVoiceRequestDetail>;
			openModal(custom.detail);
		};
		
		document.addEventListener(VOICE_OPEN_EVENT, onOpen);
		document.addEventListener(SERVICE_OPEN_EVENT, onOpen);
		
		// Позволяем открывать через window для совместимости с инлайн-скриптами
		(window as any).openVoiceRequest = (detail?: OpenVoiceRequestDetail) => openModal(detail);
		(window as any).openServiceRequest = (detail?: OpenVoiceRequestDetail) => openModal(detail);

		// Заявка, кликнутая до гидрации React-острова.
		if ((window as any).__pendingServiceRequest) {
			const pending = (window as any).__pendingServiceRequest;
			(window as any).__pendingServiceRequest = null;
			openModal(pending);
		}

		return () => {
			document.removeEventListener(VOICE_OPEN_EVENT, onOpen);
			document.removeEventListener(SERVICE_OPEN_EVENT, onOpen);
			delete (window as any).openVoiceRequest;
			delete (window as any).openServiceRequest;
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

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			chunksRef.current = [];
			startTimeRef.current = Date.now();

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data);
			};

			mediaRecorder.onstop = () => {
				const duration = (Date.now() - startTimeRef.current) / 1000;
				if (duration < 0.8) {
					setError('Запись слишком короткая. Удерживайте кнопку дольше.');
					setStatus('idle');
					return;
				}

				const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
				handleTranscription(blob);
			};

			mediaRecorder.start();
			setStatus('recording');
			setError('');
			setRecordingTime(0);

			timerRef.current = window.setInterval(() => {
				setRecordingTime(t => t + 1);
			}, 1000);
		} catch (err) {
			console.error('Mic error:', err);
			setError('Не удалось получить доступ к микрофону. Проверьте разрешения в браузере.');
		}
	};

	const stopRecording = () => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
		}
	};

	const handleTranscription = async (blob: Blob) => {
		setStatus('transcribing');
		
		const reader = new FileReader();
		reader.readAsDataURL(blob);
		reader.onloadend = async () => {
			const base64Audio = reader.result as string;
			
			try {
				const res = await fetch('/api/voice-transcribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ audio: base64Audio }),
				});
				
				const data = await res.json();
				if (data.ok) {
					setTranscription(data.text);
					setStatus(showFuelDeliveryLoadAlert ? 'searching_courier' : 'reviewing');
				} else {
					setError(data.error || 'Не удалось распознать голос. Попробуйте еще раз или введите текст вручную.');
					setTranscription('');
					setStatus('reviewing');
				}
			} catch (err) {
				setError('Ошибка соединения при распознавании.');
				setStatus('idle');
			}
		};
	};

	const handleCourierSearchComplete = useCallback(() => {
		setStatus('courier_not_found');
	}, []);

	const handleStayInQueue = useCallback(() => {
		setError('');
		setQueueMode('standard');
		setStatus('reviewing');
	}, []);

	const handlePrepayment = useCallback(() => {
		setError('');
		setQueueMode('priority');
		setStatus('reviewing');
	}, []);

	const sendQueueLead = useCallback(
		async (
			nextQueueMode: 'standard' | 'priority',
			phoneValue: string,
			locationValue: RequestLocation,
		) => {
			const prepaymentStatus: PrepaymentStatus =
				nextQueueMode === 'priority' ? 'requested' : 'skipped';

			const payload = buildCourierRequestLead({
				subject,
				phone: phoneValue,
				message: transcription,
				location: locationValue,
				service,
				queueMode: nextQueueMode,
				prepaymentStatus,
			});

			const res = await fetch(LEADS_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
		},
		[subject, transcription, service],
	);

	/** Telegram — дополнительный канал уведомления: его сбой не должен ломать заявку. */
	const notifyTelegram = useCallback(
		async (phoneValue: string) => {
			try {
				await fetch('/api/voice-submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: transcription, phone: phoneValue, subject, service }),
				});
			} catch {
				// заявка уже принята вебхуком
			}
		},
		[transcription, subject, service],
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const phoneValue = phone.trim();
		if (!phoneValue) {
			setError('Введите номер телефона для связи');
			return;
		}
		if (!transcription.trim()) {
			setError('Опишите заявку текстом или запишите голосом');
			return;
		}
		if (!location || !isLocationReady(location)) {
			setError('Укажите местоположение: разрешите геолокацию или введите город и адрес');
			return;
		}

		setError('');
		setStatus('submitting');

		try {
			await sendQueueLead(queueMode, phoneValue, location);
		} catch {
			setError('Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.');
			setStatus('reviewing');
			return;
		}

		void notifyTelegram(phoneValue);

		if (queueMode !== 'priority') {
			setStatus('success');
			return;
		}

		try {
			const res = await fetch('/api/billing/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone: phoneValue, city: location.city }),
			});
			const data = await res.json().catch(() => null);

			if (res.ok && data?.ok && typeof data.redirectUrl === 'string') {
				window.location.href = data.redirectUrl;
				return;
			}
		} catch {
			// Оплата недоступна, но намерение уже зафиксировано в заявке.
		}

		setStatus('success');
	};

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
				aria-label="Закрыть"
				onClick={closeModal}
			/>

			<div className="service-request-modal__dialog">
				{courierInfoOpen ? (
					<>
						<div className="service-request-modal__header">
							<div>
								<span className="service-request-modal__eyebrow">Для водителей</span>
								<h2 id={titleId}>Стать курьером по доставке топлива</h2>
								<p>Оставьте заявку, если готовы помогать водителям в своём городе.</p>
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

						<div className="service-request-modal__body courier-info-modal">
							<div className="courier-info-modal__intro">
								<span className="courier-info-modal__icon" aria-hidden="true">
									<i className="fa-solid fa-truck-fast"></i>
								</span>
								<p>
									Нам нужны ответственные водители, которые готовы доставлять топливо и помогать
									людям на дороге.
								</p>
							</div>

							<div className="courier-info-modal__details">
								<strong>В заявке расскажите:</strong>
								<ul>
									<li>
										<i className="fa-solid fa-location-dot" aria-hidden="true"></i>
										<span>в каком городе вы готовы оказывать помощь;</span>
									</li>
									<li>
										<i className="fa-solid fa-car-side" aria-hidden="true"></i>
										<span>какой у вас автомобиль;</span>
									</li>
									<li>
										<i className="fa-solid fa-clock" aria-hidden="true"></i>
										<span>сколько времени ежедневно готовы уделять заявкам.</span>
									</li>
								</ul>
							</div>

							<p className="courier-info-modal__note">
								После перехода заполните форму на странице контактов. Мы рассмотрим информацию и
								свяжемся с вами, если сможем предложить подходящий формат сотрудничества.
							</p>

							<div className="courier-info-modal__actions">
								<a
									href="/contacts?intent=fuel-courier#contactForm"
									className="btn-default btn-highlighted"
									data-skip-service-request
								>
									Перейти к заявке
								</a>
								<button
									type="button"
									className="courier-info-modal__back"
									onClick={() => setCourierInfoOpen(false)}
								>
									Вернуться назад
								</button>
							</div>
						</div>
					</>
				) : (
					<>
						<div className="service-request-modal__header">
					<div>
						<span className="service-request-modal__eyebrow">
							{isPartnerApplication
								? 'Анкета курьера'
								: isFuelCardRequest
									? 'Заявка на топливную карту'
									: 'Поиск исполнителя'}
						</span>
						<h2 id={titleId}>{heading}</h2>
						<p>
							{isPartnerApplication
								? 'Расскажите, где и какие заявки готовы выполнять'
								: isFuelCardRequest
									? 'Опишите бизнес, автопарк, маршруты и расход топлива'
									: 'Опишите, где и какая помощь вам нужна'}
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

				<div className="service-request-modal__body">
					{showFuelDeliveryLoadAlert && status !== 'searching_courier' && status !== 'courier_not_found' && (
						<div className="voice-load-alert mb-4" role="alert">
							<div className="voice-load-alert__heading">
								<span className="voice-load-alert__icon" aria-hidden="true">
									<i className="fa-solid fa-triangle-exclamation"></i>
								</span>
								<div>
									<strong>Высокая нагрузка на доставку топлива</strong>
									<span>Очередь может занимать до 5 дней</span>
								</div>
							</div>
							<p>
								Мы понимаем, что бензин нужен прямо сейчас. Но сервис работает на пределе
								загрузки во всех городах России. Мы подберём курьера, и он свяжется с вами,
								если сможет принять заявку. Приносим извинения за неудобства.
							</p>
							<div className="voice-load-alert__offer">
								В наших группах мы публикуем все новости о доступности топлива. Вступайте и
								следите за обновлениями. Клиентам Za-Rulem — скидка 10%.
							</div>
							<div className="voice-load-alert__actions" aria-label="Сообщества Za-Rulem">
								<a
									className="voice-load-alert__link voice-load-alert__link--vk"
									href="https://vk.ru/za_rulem72"
									target="_blank"
									rel="noopener noreferrer"
								>
									<i className="fa-brands fa-vk" aria-hidden="true"></i>
									<span>ВКонтакте</span>
								</a>
								<a
									className="voice-load-alert__link voice-load-alert__link--telegram"
									href="https://t.me/zarulem72"
									target="_blank"
									rel="noopener noreferrer"
								>
									<i className="fa-brands fa-telegram" aria-hidden="true"></i>
									<span>Telegram</span>
								</a>
							</div>
							<button
								type="button"
								className="voice-load-alert__courier"
								onClick={() => setCourierInfoOpen(true)}
							>
								<i className="fa-solid fa-truck-fast" aria-hidden="true"></i>
								<span>Хочу стать курьером по доставке топлива</span>
							</button>
						</div>
					)}

					{!showFuelDeliveryLoadAlert && (
						<div className="voice-modal-disclosure mb-4" role="note">
							<p>
								{isPartnerApplication ? (
									<>
										Вы оставляете анкету курьера{city ? ` для города ${city}` : ''}. Za-Rulem
										сопоставляет её с подходящими обращениями, но не гарантирует трудоустройство,
										количество или регулярность заявок.
									</>
								) : isFuelCardRequest ? (
									<>
										Заявка используется для подбора топливной карты по параметрам вашего бизнеса.
										После записи проверьте распознанный текст и укажите телефон для связи.
									</>
								) : isCarSelection || isPartsSelection ? (
									<>
										Вы оставляете заявку, а Za-Rulem как агрегатор подбирает подходящего исполнителя по
										параметрам и местоположению. Если исполнитель найдётся, он свяжется с вами.
									</>
								) : (
									<>
										Вы оставляете заявку, а Za-Rulem подбирает исполнителя по параметрам и
										местоположению. Если исполнитель найдётся, он свяжется с вами.
									</>
								)}
							</p>
						</div>
					)}

					{status === 'searching_courier' ? (
						<CourierSearchSimulation city={city} onComplete={handleCourierSearchComplete} />
					) : status === 'courier_not_found' ? (
						<CourierUnavailableOffer
							city={city}
							isPrepaymentPending={isPrepaymentPending}
							error={error || undefined}
							onPrepayment={handlePrepayment}
							onStayInQueue={handleStayInQueue}
						/>
					) : status === 'success' ? (
						<div className="text-center">
							<p className="ajax-response success mb-4" style={{ color: '#28a745', fontWeight: '600' }}>
								{queueMode === 'priority'
									? 'Предоплата зафиксирована как намерение: вы в приоритетной очереди. Как только топливо появится, курьер приедет к вам первым.'
									: isPartnerApplication
									? 'Анкета отправлена. Если в указанном городе появится подходящая заявка, мы свяжемся с вами.'
									: isFuelCardRequest
										? 'Заявка на топливную карту отправлена. С вами свяжутся по указанному номеру.'
										: 'Заявка отправлена на подбор. Если подходящий курьер или исполнитель найдётся, он свяжется с вами.'}
							</p>
							<button type="button" className="btn-default" onClick={closeModal}>
								Закрыть
							</button>
						</div>
					) : (
						<>
							{error && (
								<div className="alert alert-danger mb-4" role="alert" style={{ fontSize: '14px' }}>
									{error}
								</div>
							)}
							
							{status === 'idle' && (
								<>
									<div className="voice-modal-instructions mb-4" style={{ textAlign: 'left', fontSize: '14px', background: '#f9f9f9', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ffb700' }}>
										<p style={{ margin: 0, color: '#555', lineHeight: '1.6' }}>
											{isPartnerApplication ? (
												<>
													Включите запись и назовите <strong>город</strong>, <strong>автомобиль</strong>,
													<strong> АИ-92, АИ-95, АИ-100 или ДТ</strong>, которые готовы доставлять,
													<strong> районы выезда</strong>, время готовности и дополнительные навыки
													автотехпомощи.
												</>
											) : isFuelCardRequest ? (
												<>Включите запись и назовите <strong>ИП или ООО</strong>, <strong>количество машин</strong>, <strong>месячный расход</strong>, <strong>города и трассы</strong>, нужные сети АЗС и требования к документам.</>
											) : isCarSelection ? (
												<>Включите запись и назовите <strong>бюджет</strong>, <strong>параметры автомобиля</strong> и <strong>город получения</strong>. После распознавания текст можно проверить и дополнить.</>
											) : isPartsSelection ? (
												<>Включите запись и назовите <strong>VIN, frame или OEM</strong>, <strong>нужную деталь</strong> и <strong>город доставки</strong>. После распознавания текст можно проверить и дополнить.</>
											) : (
												<>Включите запись, произнесите <strong>где стоите</strong>, <strong>номер телефона</strong>, <strong>что требуется</strong>, <strong>когда нужно</strong> — система автоматически распознает вашу заявку.</>
											)}
										</p>
									</div>

									<div className="text-center py-3">
										<button 
											type="button" 
											className="voice-record-btn" 
											onClick={startRecording}
											aria-label="Начать запись"
										>
											<i className="fa-solid fa-microphone"></i>
										</button>
										<p className="mt-4" style={{ fontSize: '16px', fontWeight: '500' }}>
											Нажмите на микрофон и говорите
										</p>
									</div>
								</>
							)}
							
							{status === 'recording' && (
								<div className="text-center py-5">
									<button 
										type="button" 
										className="voice-record-btn recording" 
										onClick={stopRecording}
										aria-label="Остановить запись"
									>
										<div className="voice-pulse"></div>
										<i className="fa-solid fa-stop"></i>
									</button>
									<p className="mt-4" style={{ fontSize: '16px', fontWeight: '600', color: '#ff4444' }}>
										Идет запись... {recordingTime}с. Нажмите, чтобы закончить
									</p>
								</div>
							)}
							
							{status === 'transcribing' && (
								<div className="text-center py-5">
									<div className="spinner-border text-warning" role="status" style={{ width: '3rem', height: '3rem' }}>
										<span className="sr-only">Загрузка...</span>
									</div>
									<p className="mt-4" style={{ fontSize: '16px' }}>
										Распознаю ваш голос...
									</p>
								</div>
							)}
							
							{(status === 'reviewing' || status === 'submitting') && (
								<form onSubmit={handleSubmit} noValidate>
									{showFuelDeliveryLoadAlert && (
										<div className="voice-queue-note mb-4" role="note">
											{queueMode === 'priority'
												? 'Вы выбрали приоритетную очередь с предоплатой. Проверьте заявку и укажите телефон — после этого перейдём к оплате.'
												: 'Вы остаётесь в общей очереди. Проверьте заявку и укажите телефон для связи.'}
										</div>
									)}
									<div className="form-group mb-4">
										<label className="service-request-modal__label">
											{isPartnerApplication
												? 'Данные анкеты (распознано):'
												: isFuelCardRequest
													? 'Параметры топливной карты (распознано):'
													: 'Ваша заявка (распознано):'}
										</label>
										<textarea 
											className="form-control" 
											rows={5} 
											value={transcription}
											onChange={(e) => setTranscription(e.target.value)}
											placeholder={
												isPartnerApplication
													? 'Расскажите об автомобиле, городе и доступных заявках...'
													: isFuelCardRequest
														? 'Укажите бизнес, автопарк, расход, маршруты и нужные сети АЗС...'
														: 'Опишите ситуацию...'
											}
											required
										/>
									</div>
									<RequestLocationField
										fallbackCity={city}
										value={location}
										onChange={setLocation}
									/>
									<div className="form-group mb-4">
										<label className="service-request-modal__label">Ваш номер телефона:</label>
										<input 
											type="tel" 
											className="form-control" 
											placeholder="+7 (___) ___-__-__"
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											required
										/>
									</div>
									<div className="service-request-modal__actions d-flex flex-column gap-2">
										<button 
											type="submit" 
											className="btn-default btn-highlighted w-100"
											disabled={status === 'submitting'}
										>
											{status === 'submitting'
												? 'Отправка...'
												: queueMode === 'priority'
													? 'Отправить и перейти к оплате'
													: 'Отправить всё'}
										</button>
										<button 
											type="button" 
											className="btn-link text-muted mt-2"
											onClick={() => setStatus('idle')}
										>
											Записать заново
										</button>
									</div>
								</form>
							)}
						</>
					)}
						</div>
					</>
				)}
			</div>

			<style dangerouslySetInnerHTML={{ __html: `
				.service-request-modal__body {
					padding: 30px;
				}
				.voice-queue-note {
					padding: 10px 12px;
					border: 1px solid #fed7aa;
					border-radius: 8px;
					background: #fffaf0;
					color: #9a3412;
					font-size: 13px;
					font-weight: 600;
					line-height: 1.45;
				}
				.voice-load-alert {
					padding: 14px;
					border: 1px solid #fed7aa;
					border-left: 4px solid #ea580c;
					border-radius: 10px;
					background: #fff7ed;
					color: #431407;
				}
				.voice-load-alert__heading {
					display: flex;
					align-items: center;
					gap: 10px;
					margin-bottom: 8px;
				}
				.voice-load-alert__heading strong,
				.voice-load-alert__heading span {
					display: block;
				}
				.voice-load-alert__heading strong {
					font-size: 15px;
					line-height: 1.3;
				}
				.voice-load-alert__heading span:not(.voice-load-alert__icon) {
					margin-top: 2px;
					color: #9a3412;
					font-size: 12px;
					font-weight: 700;
				}
				.voice-load-alert__icon {
					flex: 0 0 auto;
					display: flex;
					align-items: center;
					justify-content: center;
					width: 34px;
					height: 34px;
					border-radius: 50%;
					background: #ffedd5;
					color: #c2410c;
					font-size: 15px;
				}
				.voice-load-alert__icon i {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100%;
					line-height: 1;
				}
				.voice-load-alert p {
					margin: 0;
					font-size: 13px;
					line-height: 1.45;
				}
				.voice-load-alert__offer {
					margin-top: 9px;
					padding-top: 9px;
					border-top: 1px solid #fed7aa;
					font-size: 13px;
					font-weight: 700;
					line-height: 1.4;
				}
				.voice-load-alert__actions {
					display: grid;
					grid-template-columns: repeat(2, minmax(0, 1fr));
					gap: 8px;
					margin-top: 11px;
				}
				.voice-load-alert__link {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 7px;
					min-height: 40px;
					padding: 8px 10px;
					border-radius: 8px;
					color: #fff;
					font-size: 13px;
					font-weight: 700;
					line-height: 1;
					text-decoration: none;
					transition: filter 0.2s ease, transform 0.2s ease;
				}
				.voice-load-alert__link:hover {
					color: #fff;
					filter: brightness(0.94);
					transform: translateY(-1px);
				}
				.voice-load-alert__link:focus-visible {
					outline: 3px solid rgba(234, 88, 12, 0.3);
					outline-offset: 2px;
				}
				.voice-load-alert__link--vk {
					background: #0077ff;
				}
				.voice-load-alert__link--telegram {
					background: #229ed9;
				}
				.voice-load-alert__courier {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					width: 100%;
					min-height: 42px;
					margin-top: 8px;
					padding: 9px 12px;
					border: 1px solid #c2410c;
					border-radius: 8px;
					background: #fff;
					color: #9a3412;
					font-size: 13px;
					font-weight: 700;
					line-height: 1.25;
					cursor: pointer;
					transition: background 0.2s ease, color 0.2s ease;
				}
				.voice-load-alert__courier:hover {
					background: #9a3412;
					color: #fff;
				}
				.voice-load-alert__courier:focus-visible {
					outline: 3px solid rgba(234, 88, 12, 0.3);
					outline-offset: 2px;
				}
				.courier-info-modal__intro {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 14px;
					border-radius: 10px;
					background: #fff7ed;
				}
				.courier-info-modal__intro p {
					margin: 0;
					color: #431407;
					font-size: 14px;
					line-height: 1.5;
				}
				.courier-info-modal__icon {
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
				.courier-info-modal__details {
					margin-top: 18px;
				}
				.courier-info-modal__details strong {
					display: block;
					margin-bottom: 10px;
					color: #0f172a;
					font-size: 15px;
				}
				.courier-info-modal__details ul {
					display: grid;
					gap: 8px;
					margin: 0;
					padding: 0;
					list-style: none;
				}
				.courier-info-modal__details li {
					display: flex;
					align-items: flex-start;
					gap: 9px;
					padding: 10px 12px;
					border: 1px solid #e2e8f0;
					border-radius: 8px;
					color: #334155;
					font-size: 14px;
					line-height: 1.4;
				}
				.courier-info-modal__details li i {
					width: 16px;
					margin-top: 3px;
					color: #c2410c;
					text-align: center;
				}
				.courier-info-modal__note {
					margin: 16px 0 0;
					color: #64748b;
					font-size: 13px;
					line-height: 1.5;
				}
				.courier-info-modal__actions {
					display: grid;
					gap: 8px;
					margin-top: 18px;
				}
				.courier-info-modal__actions .btn-default {
					width: 100%;
					text-align: center;
				}
				.courier-info-modal__back {
					padding: 8px;
					border: 0;
					background: transparent;
					color: #64748b;
					font-size: 13px;
					text-decoration: underline;
					text-underline-offset: 3px;
					cursor: pointer;
				}
				.voice-modal-disclosure {
					padding: 15px;
					border: 1px solid rgba(255, 183, 0, 0.45);
					border-radius: 8px;
					background: #fffaf0;
				}
				.voice-modal-disclosure p {
					margin: 0;
					color: #3f3f3f;
					font-size: 14px;
					line-height: 1.6;
				}
				.voice-record-btn {
					width: 90px;
					height: 90px;
					border-radius: 50%;
					border: none;
					background: #ffb700;
					color: #000;
					font-size: 36px;
					cursor: pointer;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
					position: relative;
					box-shadow: 0 4px 15px rgba(255, 183, 0, 0.3);
				}
				.voice-record-btn:hover {
					transform: scale(1.05);
					box-shadow: 0 6px 20px rgba(255, 183, 0, 0.4);
				}
				.voice-record-btn.recording {
					background: #ff4444;
					color: #fff;
					box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
				}
				.voice-pulse {
					position: absolute;
					width: 100%;
					height: 100%;
					border-radius: 50%;
					background: #ff4444;
					opacity: 0.6;
					animation: voice-pulse-anim 1.5s infinite;
				}
				@keyframes voice-pulse-anim {
					0% { transform: scale(1); opacity: 0.6; }
					100% { transform: scale(1.8); opacity: 0; }
				}
				.service-request-modal__label {
					display: block;
					margin-bottom: 8px;
					font-weight: 600;
					font-size: 14px;
					color: #333;
				}
				.btn-link {
					background: none;
					border: none;
					text-decoration: underline;
					cursor: pointer;
					font-size: 14px;
				}
				@media (max-width: 575px) {
					.service-request-modal__body {
						padding: 0;
					}
					.voice-load-alert {
						padding: 12px;
					}
					.voice-load-alert__heading strong {
						font-size: 14px;
					}
				}
			`}} />
		</div>,
		document.body
	);
}
