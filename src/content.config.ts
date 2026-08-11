import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const offerSchema = z.object({
	title: z.string(),
	description: z.string(),
	icon: z.string().default('/images/icon-service-1.svg'),
});

const faqSchema = z.object({
	question: z.string(),
	answer: z.string(),
});

const processSchema = z
	.object({
		title: z.string().optional(),
		step1Title: z.string().optional(),
		step1Desc: z.string().optional(),
		step2Title: z.string().optional(),
		step2Desc: z.string().optional(),
		step3Title: z.string().optional(),
		step3Desc: z.string().optional(),
		step4Title: z.string().optional(),
		step4Desc: z.string().optional(),
	})
	.optional();

const pricingSchema = z
	.object({
		title: z.string().optional(),
		items: z
			.array(
				z.object({
					title: z.string(),
					price: z.string(),
					description: z.string().optional(),
					features: z.array(z.string()).default([]),
				}),
			)
			.default([]),
	})
	.optional();

const approachSchema = z
	.object({
		subtitle: z.string().optional(),
		title: z.string().optional(),
		image: z.string().optional(),
		imageAlt: z.string().optional(),
		footerText: z.string().optional(),
		footerLinkHref: z.string().optional(),
		footerLinkLabel: z.string().optional(),
		footerBadge: z.string().optional(),
		items: z
			.array(
				z.object({
					title: z.string(),
					description: z.string(),
					icon: z.string().optional(),
					points: z.array(z.string()).default([]),
				}),
			)
			.optional(),
	})
	.optional();

const whyChooseSchema = z
	.object({
		subtitle: z.string().optional(),
		title: z.string().optional(),
		image1: z.string().optional(),
		image1Alt: z.string().optional(),
		image2: z.string().optional(),
		image2Alt: z.string().optional(),
		counterLabel: z.string().optional(),
		items: z
			.array(
				z.object({
					title: z.string(),
					description: z.string(),
					icon: z.string().optional(),
				}),
			)
			.optional(),
	})
	.optional();

const seoSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().optional(),
	})
	.optional();

const roadSituationSchema = z.enum([
	'stalled',
	'towing',
	'fuel',
	'battery',
	'wheel',
	'ditch',
	'accident',
	'other',
]);

// services — pillar (хабы)
const services = defineCollection({
	loader: glob({
		pattern: '*/index.md',
		base: './src/content/services',
		generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		hub: z.boolean().default(false),
		seo: seoSchema,
		image: z.string().optional(),
		no: z.string().optional(),
		icon: z.string().optional(),
		tags: z.array(z.string()).default([]),
		offersTitle: z.string().optional(),
		offersDescription: z.string().optional(),
		offers: z.array(offerSchema).default([]),
		featuresTitle: z.string().optional(),
		featuresDescription: z.string().optional(),
		features: z.array(z.string()).default([]),
		stats: z
			.array(z.object({ value: z.string(), suffix: z.string().default(''), label: z.string() }))
			.default([]),
		faqs: z.array(faqSchema).default([]),
		process: processSchema,
		pricing: pricingSchema,
		approach: approachSchema,
		whyChoose: whyChooseSchema,
	}),
});

// serviceLanding — spokes (посадочные)
const serviceLanding = defineCollection({
	loader: glob({ pattern: ['*/*.md', '!*/index.md'], base: './src/content/services' }),
	schema: z.object({
		cluster: z.string(),
		title: z.string(),
		description: z.string(),
		seo: seoSchema,
		excerpt: z.string().optional(),
		dateLabel: z.string().optional(),
		image: z.string().optional(),
		imageAlt: z.string().optional(),
		icon: z.string().default('/images/icon-service-offer-list-1.svg'),
		order: z.number().default(0),
		tags: z.array(z.string()).default([]),
		offers: z.array(offerSchema).default([]),
		features: z.array(z.string()).default([]),
		faqs: z.array(faqSchema).default([]),
		process: processSchema,
		pricing: pricingSchema,
	}),
});

// blog — статьи
const blog = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		seo: seoSchema,
		date: z.coerce.date(),
		author: z.string().default('Мастер техпомощи «За рулём»'),
		image: z.string().optional(),
		imageAlt: z.string().optional(),
		category: z.string().default('Полезное'),
		tags: z.array(z.string()).default([]),
		showFuelPricesTable: z.boolean().optional(),
	}),
});

// routes — федеральные трассы и посадочные страницы помощи на дороге
const routes = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/routes' }),
	schema: z.object({
		code: z.string(),
		name: z.string(),
		route: z.string(),
		title: z.string(),
		description: z.string(),
		seo: z.object({
			title: z.string(),
			description: z.string(),
			ogTitle: z.string().optional(),
			ogDescription: z.string().optional(),
		}),
		aliases: z.array(z.string()).default([]),
		legacySlugs: z.array(z.string()).default([]),
		regions: z.array(z.string()).min(1),
		majorCities: z.array(z.string()).default([]),
		situations: z.array(roadSituationSchema).min(1),
		conditions: z
			.array(
				z.object({
					title: z.string(),
					description: z.string(),
				}),
			)
			.default([]),
		faqs: z.array(faqSchema).default([]),
		relatedRoutes: z.array(z.string()).default([]),
		image: z.string().default('/images/road-page-single-image.jpg'),
		imageAlt: z.string(),
		order: z.number().int().nonnegative(),
		featured: z.boolean().default(false),
	}),
});

export const collections = { services, serviceLanding, blog, routes };
