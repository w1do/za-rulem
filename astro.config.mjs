// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import llms from 'astro-llms-md';
import compress from 'astro-compress';
import { loadEnv } from 'vite';

import node from '@astrojs/node';

const SITE = 'https://za-rulem.org';
const mode = process.env.NODE_ENV ?? 'development';
const env = loadEnv(mode, process.cwd(), '');

// Конфигурационные модули загружаются до Astro runtime, поэтому передаём им
// env явно. Переменная остаётся server-only и не получает префикс PUBLIC_.
process.env.DEFAULT_CITY_SLUG ??= env.DEFAULT_CITY_SLUG;

const { getCitySitemapUrls, isCitySitemapUrl } = await import('./src/lib/sitemap/cityUrls');
const { getCityBySlug } = await import('./src/lib/city');
const defaultCity = getCityBySlug();

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  vite: {
    css: {
      lightningcss: {
        errorRecovery: true,
      },
    },
    build: {
      cssMinify: 'lightningcss',
      assetsInlineLimit: 2048,
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['@directus/sdk', 'react', 'react-dom'],
    },
    server: {
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  },
  integrations: [
    react(),
    sitemap({
      changefreq: 'weekly',
      priority: 1.0,
      lastmod: new Date(),
      // Городские маршруты работают через SSR, поэтому в pages их нет.
      customPages: getCitySitemapUrls(SITE),
      // Две карты в одном индексе: sitemap-cities-0.xml и sitemap-pages-0.xml.
      chunks: {
        cities: (item) => (isCitySitemapUrl(item.url) ? item : undefined),
      },
    }),
    llms({
      name: `За рулём — техпомощь на дороге ${defaultCity.inCity}`,
      description:
        `Круглосуточная автопомощь на дороге ${defaultCity.inCity}: прикурить авто, замена аккумулятора, отогрев машины, вскрытие автомобиля и подвоз топлива. Выезд 24/7 за 20–40 минут.`,
      contentSelector: 'body',
      excludeSelectors: [
        'header',
        'nav',
        '.main-footer-gold',
        '.preloader',
        'form',
        'noscript',
      ],
    }),
    compress({
      CSS: false, // Уже сжимается Vite + lightningcss
      Image: false, // Уже сжимается astro:assets + sharp
      Action: {
        passed: (file) => {
          console.log(`Compressed: ${file}`);
        },
      },
    }),
  ],

  adapter: node({
    mode: 'standalone',
  }),
});
