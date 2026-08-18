import { useCallback, useEffect, useRef, useState } from 'react';
import {
	GeolocationRequestError,
	formatCoordinates,
	requestBrowserPoint,
	reverseGeocode,
	type RequestLocation,
} from '../../lib/geo/requestLocation';

type Props = {
	/** Город страницы, используется как подсказка при ручном вводе. */
	fallbackCity?: string;
	value: RequestLocation | null;
	onChange: (location: RequestLocation | null) => void;
};

/**
 * Обязательный блок местоположения заявки: точные координаты браузера
 * с определением города или ручной ввод города и адреса при отказе в доступе.
 */
export default function RequestLocationField({ fallbackCity, value, onChange }: Props) {
	const [isLocating, setIsLocating] = useState(false);
	const [geoError, setGeoError] = useState('');
	const [isManual, setIsManual] = useState(false);
	const [manualCity, setManualCity] = useState(fallbackCity ?? '');
	const [manualAddress, setManualAddress] = useState('');
	const isMountedRef = useRef(true);
	const isAutoRequestedRef = useRef(false);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const detectLocation = useCallback(async () => {
		setGeoError('');
		setIsLocating(true);

		try {
			const point = await requestBrowserPoint();
			const geocoded = await reverseGeocode(point);
			if (!isMountedRef.current) return;

			const city = geocoded?.city || fallbackCity || '';
			if (!city) {
				setIsManual(true);
				setGeoError('Координаты получены, но город определить не удалось — укажите его вручную.');
				setManualAddress(formatCoordinates(point));
				onChange(null);
				return;
			}

			setIsManual(false);
			onChange({
				source: 'gps',
				city,
				address: geocoded?.address,
				point,
			});
		} catch (error) {
			if (!isMountedRef.current) return;
			setIsManual(true);
			setGeoError(
				error instanceof GeolocationRequestError
					? error.message
					: 'Не удалось определить местоположение. Укажите город и адрес вручную.',
			);
			onChange(null);
		} finally {
			if (isMountedRef.current) setIsLocating(false);
		}
	}, [fallbackCity, onChange]);

	useEffect(() => {
		if (isAutoRequestedRef.current) return;
		isAutoRequestedRef.current = true;
		void detectLocation();
	}, [detectLocation]);

	const applyManual = useCallback(
		(city: string, address: string) => {
			const trimmedCity = city.trim();
			const trimmedAddress = address.trim();
			onChange(
				trimmedCity && trimmedAddress
					? { source: 'manual', city: trimmedCity, address: trimmedAddress }
					: null,
			);
		},
		[onChange],
	);

	return (
		<div className="request-location mb-4">
			<span className="service-request-modal__label">Местоположение (обязательно):</span>

			<div className="request-location__status" aria-live="polite">
				{isLocating && 'Определяем ваше местоположение…'}
				{!isLocating && value?.source === 'gps' && value.point && (
					<>
						<strong>{value.city}</strong>
						{value.address ? <div className="request-location__address">{value.address}</div> : null}
						<div className="request-location__coords">
							Координаты: {formatCoordinates(value.point)} (±{Math.round(value.point.accuracyM)} м)
						</div>
					</>
				)}
				{!isLocating && value?.source === 'manual' && (
					<>
						<strong>{value.city}</strong>
						<div className="request-location__address">{value.address}</div>
					</>
				)}
				{!isLocating && !value && !geoError && 'Местоположение не определено'}
			</div>

			{geoError && (
				<p className="request-location__error" role="alert">
					{geoError}
				</p>
			)}

			{(isManual || !value) && (
				<div className="request-location__manual">
					<input
						type="text"
						className="form-control mb-2"
						placeholder="Город"
						value={manualCity}
						onChange={(e) => {
							setManualCity(e.target.value);
							applyManual(e.target.value, manualAddress);
						}}
					/>
					<input
						type="text"
						className="form-control"
						placeholder="Улица, дом или ориентир"
						value={manualAddress}
						onChange={(e) => {
							setManualAddress(e.target.value);
							applyManual(manualCity, e.target.value);
						}}
					/>
				</div>
			)}

			<button
				type="button"
				className="request-location__retry"
				onClick={() => void detectLocation()}
				disabled={isLocating}
			>
				{isLocating ? 'Определяем…' : 'Определить местоположение автоматически'}
			</button>

			<style>{`
				.request-location__status {
					margin-top: 6px;
					padding: 10px 12px;
					border: 1px solid #e5e7eb;
					border-radius: 8px;
					background: #f9fafb;
					font-size: 14px;
					line-height: 1.5;
					color: #374151;
				}
				.request-location__address,
				.request-location__coords {
					font-size: 13px;
					color: #6b7280;
				}
				.request-location__error {
					margin: 8px 0 0;
					font-size: 13px;
					font-weight: 600;
					color: #b91c1c;
				}
				.request-location__manual {
					margin-top: 10px;
				}
				.request-location__retry {
					margin-top: 10px;
					padding: 0;
					border: 0;
					background: none;
					font-size: 13px;
					font-weight: 600;
					color: #ea580c;
					text-decoration: underline;
					cursor: pointer;
				}
				.request-location__retry:disabled {
					color: #9ca3af;
					cursor: default;
				}
			`}</style>
		</div>
	);
}
