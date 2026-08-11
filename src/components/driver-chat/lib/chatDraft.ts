const DRAFT_MAX_LENGTH = 500;

export const parseChatDraft = (search: string): string => {
	const draft = new URLSearchParams(search).get('draft')?.trim() ?? '';
	return draft.slice(0, DRAFT_MAX_LENGTH);
};

export const readChatDraft = (): string => parseChatDraft(window.location.search);

export const clearChatDraft = (): void => {
	if (typeof window === 'undefined' || !window.history?.replaceState) return;
	try {
		const url = new URL(window.location.href);
		if (!url.searchParams.has('draft')) return;
		url.searchParams.delete('draft');
		window.history.replaceState(window.history.state, '', url.toString());
	} catch (e) {
		console.warn('Chat draft URL cleanup failed:', e);
	}
};
