import { useCallback, useMemo, useState } from 'react';

import { TARIFFS_BY_KIND, URGENCY_META, URGENCY_ORDER } from '../model/constants.ts';
import { findTariff, formatPrice } from '../model/pricing.ts';
import { useRequestStore } from '../model/useRequestStore.ts';
import type {
	CreateRequestInput,
	MapRequest,
	MapStation,
	RequestKind,
	UrgencyLevel,
} from '../model/types.ts';
import CreateRequestModal from './CreateRequestModal.tsx';
import RequestDetailsPopup from './RequestDetailsPopup.tsx';
import { useRequestMap } from './useRequestMap.ts';
import './RequestMap.css';

/**
 * Полноширинная интерактивная карта заявок.
 * Клик по карте выбирает точку и открывает форму, клик по метке — карточку со звонком.
 */

export interface InteractiveRequestMapProps {
	kind: RequestKind;
	citySlug: string;
	cityName: string;
	cityLat: number;
	cityLng: number;
	/** АЗС города: рисуются на карте, чтобы не пришлось искать заправку вслепую. */
	stations?: MapStation[];
}

const HINTS: Record<RequestKind, string> = {
	queue: 'Нажмите на карту в месте заправки, чтобы разместить заявку на очередь',
	assistance: 'Нажмите на карту там, где стоит машина, чтобы вызвать помощь',
};

export default function InteractiveRequestMap({
	kind,
	citySlug,
	cityName,
	cityLat,
	cityLng,
	stations = [],
}: InteractiveRequestMapProps) {
	const store = useRequestStore({ kind, citySlug });

	const [draftPoint, setDraftPoint] = useState<{ lat: number; lng: number } | null>(null);
	const [draftUrgency, setDraftUrgency] = useState<UrgencyLevel>('red');
	const [isModalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState<MapRequest | null>(null);
	const [draftMessage, setDraftMessage] = useState('');

	const center = useMemo<[number, number]>(() => [cityLat, cityLng], [cityLat, cityLng]);
	const defaultTariffId = TARIFFS_BY_KIND[kind][0]!.id;

	const handleMapClick = useCallback(
		(lat: number, lng: number) => {
			setSelected(null);
			setDraftPoint({ lat, lng });
			setDraftMessage('');
			store.resetStatus();
			setModalOpen(true);
		},
		[store],
	);

	// Клик по пину АЗС — самый частый сценарий: точка и адрес подставляются автоматически.
	const handleStationClick = useCallback(
		(station: MapStation) => {
			setSelected(null);
			setDraftPoint({ lat: station.lat, lng: station.lng });
			setDraftMessage(
				[`АЗС «${station.name}»`, station.address].filter(Boolean).join(', '),
			);
			store.resetStatus();
			setModalOpen(true);
		},
		[store],
	);

	const handleRequestClick = useCallback((request: MapRequest) => {
		setSelected(request);
	}, []);

	const { containerRef, focusRequest } = useRequestMap({
		center,
		requests: store.visibleRequests,
		stations,
		onStationClick: handleStationClick,
		draftPoint,
		draftUrgency,
		onMapClick: handleMapClick,
		onRequestClick: handleRequestClick,
	});

	const handleSubmit = useCallback(
		async (input: CreateRequestInput) => {
			const created = await store.createRequest(input);
			if (!created) return;

			setDraftPoint(null);
			setDraftMessage('');
			setModalOpen(false);
			setSelected(created);
			focusRequest(created);
		},
		[store, focusRequest],
	);

	const handleCardClick = (request: MapRequest) => {
		setSelected(request);
		focusRequest(request);
	};

	const openModalWithoutPoint = () => {
		setDraftMessage('');
		store.resetStatus();
		setModalOpen(true);
	};

	return (
		<div className="request-map">
			<div ref={containerRef} className="request-map__canvas" />

			<p className="request-map__hint">{HINTS[kind]}</p>

			{stations.length > 0 ? (
				<p className="request-map__stations-hint">
					На карте отмечены {stations.length} АЗС {cityName}: нажмите на пин заправки, чтобы
					сразу подставить её адрес в заявку.
				</p>
			) : null}

			<div className="request-map__panel">
				<h2 className="request-map__panel-title">
					Горячие заявки — {cityName} ({store.visibleRequests.length})
				</h2>

				<div className="request-map__filters">
					<button
						type="button"
						className="request-map__filter"
						aria-pressed={store.urgencyFilter === 'all'}
						onClick={() => store.setUrgencyFilter('all')}
					>
						Все
					</button>
					{URGENCY_ORDER.map((level) => {
						const meta = URGENCY_META[level];
						return (
							<button
								key={level}
								type="button"
								className="request-map__filter"
								style={{ ['--filter-color' as string]: meta.color }}
								aria-pressed={store.urgencyFilter === level}
								onClick={() => store.setUrgencyFilter(level)}
							>
								{meta.label} +{meta.markupPercent}%
							</button>
						);
					})}
				</div>

				{store.visibleRequests.length === 0 ? (
					<p className="request-map__empty">
						Активных заявок нет. Поставьте свою метку — её увидят все водители города.
					</p>
				) : (
					<ul className="request-map__list">
						{store.visibleRequests.map((request) => {
							const meta = URGENCY_META[request.urgency];
							const tariff = findTariff(request.kind, request.tariffId);

							return (
								<li key={request.id}>
									<button
										type="button"
										className="request-card"
										style={{ ['--card-color' as string]: meta.color }}
										onClick={() => handleCardClick(request)}
									>
										<span className="request-card__top">
											<span className="request-card__price">
												{formatPrice(request.price)}
											</span>
											<span className="request-card__urgency">{meta.label}</span>
										</span>
										<span className="request-card__tariff">
											{tariff?.icon} {tariff?.label ?? 'Заявка'}
										</span>
										<p className="request-card__message">{request.message}</p>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			<button type="button" className="request-map__cta" onClick={openModalWithoutPoint}>
				Подать заявку
			</button>

			{selected ? (
				<RequestDetailsPopup request={selected} onClose={() => setSelected(null)} />
			) : null}

			{isModalOpen ? (
				<CreateRequestModal
					kind={kind}
					point={draftPoint}
					defaultTariffId={defaultTariffId}
					initialMessage={draftMessage}
					urgency={draftUrgency}
					onUrgencyChange={setDraftUrgency}
					status={store.status}
					errors={store.errors}
					submitError={store.submitError}
					onSubmit={handleSubmit}
					onClose={() => {
						setModalOpen(false);
						setDraftPoint(null);
						setDraftMessage('');
						store.resetStatus();
					}}
				/>
			) : null}
		</div>
	);
}
