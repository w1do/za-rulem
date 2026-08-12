export type FuelCardFeature = {
	label: string;
	value: string;
};

type FuelCardOfferBase = {
	id: string;
	title: string;
	summary: string;
	audience: string;
	icon: string;
	logo?: string;
	features: FuelCardFeature[];
};

export type FuelCardOffer = FuelCardOfferBase;

export type FuelCardBrand = {
	slug: string;
	name: string;
};

export type FuelCardCriterion = {
	title: string;
	text: string;
	icon: string;
};

export type FuelCardFaq = {
	question: string;
	answer: string;
};
