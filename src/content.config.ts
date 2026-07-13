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

const seoSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().optional(),
	})
	.optional();

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
	}),
});

export const collections = { services, serviceLanding, blog };
