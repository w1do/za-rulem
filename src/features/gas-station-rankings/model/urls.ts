import type { RankingKind } from './types.ts';

export const rankingSlugByKind: Record<RankingKind, string> = {
	cheapest: 'deshevye-zapravki',
	expensive: 'dorogie-zapravki',
};

export const rankingKindBySlug = (slug?: string): RankingKind | null => {
	if (slug === rankingSlugByKind.cheapest) return 'cheapest';
	if (slug === rankingSlugByKind.expensive) return 'expensive';
	return null;
};

export const azsRankingUrl = (citySlug: string, kind: RankingKind): string =>
	`/${citySlug}/azs/${rankingSlugByKind[kind]}`;
