import { useCallback, useEffect, useId, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PHONE_NUMBER, PHONE_NUMBER_FORMATTED } from '../../lib/seo';

export const VOICE_OPEN_EVENT = 'za-rulem:open-voice-request';
export const SERVICE_OPEN_EVENT = 'za-rulem:open-service-request';

export type OpenVoiceRequestDetail = {
	service?: string;
	subject?: string;
	title?: string;
};

/**
 * Модальное окно для голосовой заявки.
 * Человек записывает голос -> Polza AI транскрибирует -> Человек проверяет и отправляет.
 */
export default function VoiceRequestModal() {
	const titleId = useId();
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	const [heading, setHeading] = useState('Как вам удобнее?');
	const [subject, setSubject] = useState('Голосовая заявка — za-rulem');
	const [service, setService] = useState<string | undefined>();

	const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'reviewing' | 'submitting' | 'success' | 'error'>('idle');
	const [transcription, setTranscription] = useState('');
	const [phone, setPhone] = useState('');
	const [error, setError] = useState('');
	const [recordingTime, setRecordingTime] = useState(0);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const startTimeRef = useRef<number>(0);
	const timerRef = useRef<number | null>(null);

	const openModal = useCallback((detail?: OpenVoiceRequestDetail) => {
		setHeading(detail?.title || 'Как вам удобнее?');
		setSubject(detail?.subject || 'Голосовая заявка — za-rulem');
		setService(detail?.service);
		setStatus('idle');
		setTranscription('');
		setError('');
		setOpen(true);
	}, []);

	const closeModal = useCallback(() => {
		setOpen(false);
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
					setStatus('reviewing');
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!phone) {
			setError('Введите номер телефона для связи');
			return;
		}
		
		setStatus('submitting');
		try {
			const res = await fetch('/api/voice-submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: transcription, phone, subject, service }),
			});
			
			const data = await res.json();
			if (data.ok) {
				setStatus('success');
			} else {
				setError(data.error || 'Ошибка при отправке заявки');
				setStatus('reviewing');
			}
		} catch (err) {
			setError('Ошибка соединения при отправке.');
			setStatus('reviewing');
		}
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
				<div className="service-request-modal__header">
					<div>
						<span className="service-request-modal__eyebrow">Связь с мастером</span>
						<h2 id={titleId}>{heading}</h2>
						<p>
							Вы можете позвонить или описать проблему
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

				<div className="service-request-modal__body" style={{ padding: '30px' }}>
					{status === 'success' ? (
						<div className="text-center">
							<p className="ajax-response success mb-4" style={{ color: '#28a745', fontWeight: '600' }}>
								Заявка успешно отправлена! Я перезвоню вам в течение пары минут.
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
									<div className="text-center mb-5">
										<a href={`tel:${PHONE_NUMBER}`} className="voice-modal-phone-btn">
											<i className="fa-solid fa-phone"></i> {PHONE_NUMBER_FORMATTED}
										</a>
										<div className="mt-3 text-muted" style={{ fontSize: '14px' }}>
											Нажмите для прямого звонка
										</div>
									</div>

									<div className="voice-modal-separator mb-5">
										<span>ИЛИ ОПИШИТЕ ГОЛОСОМ</span>
									</div>

									<div className="voice-modal-instructions mb-4" style={{ textAlign: 'left', fontSize: '14px', background: '#f9f9f9', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ffb700' }}>
										<p style={{ margin: 0, color: '#555', lineHeight: '1.6' }}>
											Включите запись, произнесите <strong>где стоите</strong>, <strong>номер телефона</strong>, 
											<strong>что требуется</strong>, <strong>когда нужно</strong> — система автоматически распознает вашу заявку.
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
									<div className="form-group mb-4">
										<label className="service-request-modal__label">Ваша проблема (распознано):</label>
										<textarea 
											className="form-control" 
											rows={5} 
											value={transcription}
											onChange={(e) => setTranscription(e.target.value)}
											placeholder="Опишите ситуацию..."
											required
										/>
									</div>
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
											{status === 'submitting' ? 'Отправка...' : 'Отправить всё'}
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
			</div>
			
			<style dangerouslySetInnerHTML={{ __html: `
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
				.voice-modal-phone-btn {
					display: inline-flex;
					align-items: center;
					gap: 12px;
					background: #000;
					color: #ffb700;
					padding: 15px 30px;
					border-radius: 50px;
					font-size: 20px;
					font-weight: 700;
					text-decoration: none;
					transition: all 0.3s ease;
					border: 2px solid #ffb700;
				}
				.voice-modal-phone-btn:hover {
					background: #ffb700;
					color: #000;
				}
				.voice-modal-separator {
					position: relative;
					text-align: center;
				}
				.voice-modal-separator::before {
					content: "";
					position: absolute;
					top: 50%;
					left: 0;
					right: 0;
					height: 1px;
					background: #eee;
					z-index: 1;
				}
				.voice-modal-separator span {
					position: relative;
					z-index: 2;
					background: #fff;
					padding: 0 15px;
					color: #999;
					font-size: 12px;
					font-weight: 600;
					letter-spacing: 1px;
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
			`}} />
		</div>,
		document.body
	);
}
