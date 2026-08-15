import { useCallback, useEffect, useMemo, useState } from 'react';

import {
	buildStorageKey,
	mergeRequests,
	parseStoredRequests,
	sortRequests,
} from './requestStorage.ts';
import { buildMapRequest, sendRequestToWebhook, validateRequest } from './submitRequest.ts';
import type {
	CreateRequestInput,
	MapRequest,
	RequestKind,
	RequestValidationErrors,
	UrgencyLevel,
} from './types.ts';

/**
 * Клиентское хранилище заявок карты.
 * Показываются только реальные заявки: они сохраняются в localStorage
 * и переживают перезагрузку страницы.
 */

export type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RequestStoreOptions {
	kind: RequestKind;
	citySlug: string;
}

export interface RequestStore {
	requests: MapRequest[];
	/** Заявки после применения фильтра срочности. */
	visibleRequests: MapRequest[];
	urgencyFilter: UrgencyLevel | 'all';
	setUrgencyFilter: (value: UrgencyLevel | 'all') => void;
	status: SubmitStatus;
	errors: RequestValidationErrors;
	submitError: string;
	createRequest: (input: CreateRequestInput) => Promise<MapRequest | null>;
	resetStatus: () => void;
}

export function useRequestStore({ kind, citySlug }: RequestStoreOptions): RequestStore {
	const [requests, setRequests] = useState<MapRequest[]>([]);
	const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
	const [status, setStatus] = useState<SubmitStatus>('idle');
	const [errors, setErrors] = useState<RequestValidationErrors>({});
	const [submitError, setSubmitError] = useState('');

	const storageKey = buildStorageKey(kind, citySlug);

	useEffect(() => {
		const stored = parseStoredRequests(window.localStorage.getItem(storageKey));
		setRequests(sortRequests(mergeRequests([], stored)));
	}, [storageKey]);

	const persist = useCallback(
		(next: MapRequest[]) => {
			try {
				window.localStorage.setItem(storageKey, JSON.stringify(next));
			} catch {
				// Приватный режим или переполненное хранилище: заявка всё равно уже отправлена.
			}
		},
		[storageKey],
	);

	const createRequest = useCallback(
		async (input: CreateRequestInput): Promise<MapRequest | null> => {
			const validationErrors = validateRequest(input);
			setErrors(validationErrors);

			if (Object.keys(validationErrors).length > 0) {
				setStatus('error');
				setSubmitError('');
				return null;
			}

			const request = buildMapRequest(input);
			if (!request) {
				setStatus('error');
				setSubmitError('Не удалось рассчитать стоимость заявки.');
				return null;
			}

			setStatus('loading');
			setSubmitError('');

			try {
				await sendRequestToWebhook(request);
			} catch {
				setStatus('error');
				setSubmitError('Заявка не ушла: проверьте связь и попробуйте ещё раз.');
				return null;
			}

			setRequests((prev) => {
				const next = sortRequests([request, ...prev]);
				persist(next);
				return next;
			});
			setStatus('success');
			return request;
		},
		[persist],
	);

	const resetStatus = useCallback(() => {
		setStatus('idle');
		setErrors({});
		setSubmitError('');
	}, []);

	const visibleRequests = useMemo(
		() =>
			urgencyFilter === 'all'
				? requests
				: requests.filter((request) => request.urgency === urgencyFilter),
		[requests, urgencyFilter],
	);

	return {
		requests,
		visibleRequests,
		urgencyFilter,
		setUrgencyFilter,
		status,
		errors,
		submitError,
		createRequest,
		resetStatus,
	};
}
