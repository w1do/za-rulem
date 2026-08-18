import { useEffect, useState } from 'react';
import {
	COURIER_SEARCH_DURATION_MS,
	COURIER_SEARCH_END,
	COURIER_SEARCH_START,
	getCounterAt,
	getStageText,
} from './courierSearchProgress';

type Props = {
	city?: string;
	durationMs?: number;
	onComplete: () => void;
};

/**
 * Эмуляция поиска курьера: обратный отсчёт 100 → 30 и смена статусов сканирования.
 */
export default function CourierSearchSimulation({ city, durationMs = COURIER_SEARCH_DURATION_MS, onComplete }: Props) {
	const [counter, setCounter] = useState(COURIER_SEARCH_START);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		setReducedMotion(query.matches);
		const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}, []);

	useEffect(() => {
		const startedAt = Date.now();
		const intervalId = window.setInterval(() => {
			const value = getCounterAt(Date.now() - startedAt, durationMs);
			setCounter(value);
			if (value <= COURIER_SEARCH_END) {
				window.clearInterval(intervalId);
				onComplete();
			}
		}, 60);

		return () => window.clearInterval(intervalId);
	}, [durationMs, onComplete]);

	const progress = ((COURIER_SEARCH_START - counter) / (COURIER_SEARCH_START - COURIER_SEARCH_END)) * 100;

	return (
		<div className="courier-search" data-reduced-motion={reducedMotion ? 'true' : 'false'}>
			<div className="courier-search__radar" aria-hidden="true">
				<span className="courier-search__wave"></span>
				<span className="courier-search__wave courier-search__wave--delayed"></span>
				<span className="courier-search__counter">{counter}</span>
			</div>

			<p className="courier-search__title">
				Подбираем курьера{city ? ` — ${city}` : ''}
			</p>

			<p className="courier-search__stage" aria-live="polite">
				{getStageText(counter)}
			</p>

			<div
				className="courier-search__progress"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progress)}
				aria-label="Прогресс поиска курьера"
			>
				<span style={{ width: `${progress}%` }}></span>
			</div>

			<style dangerouslySetInnerHTML={{ __html: `
				.courier-search {
					padding: 24px 12px;
					text-align: center;
				}
				.courier-search__radar {
					position: relative;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 116px;
					height: 116px;
					border-radius: 50%;
					background: radial-gradient(circle, #fff7ed 0%, #ffedd5 100%);
					border: 2px solid #F5B754;
				}
				.courier-search__counter {
					position: relative;
					z-index: 1;
					color: #9a3412;
					font-size: 34px;
					font-weight: 800;
					font-variant-numeric: tabular-nums;
				}
				.courier-search__wave {
					position: absolute;
					inset: 0;
					border-radius: 50%;
					border: 2px solid rgba(245, 183, 84, 0.8);
					animation: courier-search-wave 1.8s ease-out infinite;
				}
				.courier-search__wave--delayed {
					animation-delay: 0.9s;
				}
				.courier-search[data-reduced-motion='true'] .courier-search__wave {
					animation: none;
					opacity: 0.35;
				}
				@keyframes courier-search-wave {
					0% { transform: scale(1); opacity: 0.7; }
					100% { transform: scale(1.6); opacity: 0; }
				}
				.courier-search__title {
					margin: 18px 0 4px;
					color: #0f172a;
					font-size: 17px;
					font-weight: 700;
				}
				.courier-search__stage {
					margin: 0 0 16px;
					color: #64748b;
					font-size: 14px;
					line-height: 1.5;
				}
				.courier-search__progress {
					height: 8px;
					border-radius: 999px;
					background: #f1f5f9;
					overflow: hidden;
				}
				.courier-search__progress span {
					display: block;
					height: 100%;
					border-radius: 999px;
					background: linear-gradient(90deg, #F5B754, #ea580c);
					transition: width 0.2s linear;
				}
				.courier-search[data-reduced-motion='true'] .courier-search__progress span {
					transition: none;
				}
			`}} />
		</div>
	);
}
