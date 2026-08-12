// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import llms from 'astro-llms-md';
import compress from 'astro-compress';

import node from '@astrojs/node';

const SITE = 'https://za-rulem.org';

const { getCitySitemapUrls, isCitySitemapUrl } = await import('./src/lib/sitemap/cityUrls');
const { getGasPriceSitemapUrls } = await import('./src/features/gas-prices/server');
const { defaultCity } = await import('./src/lib/cities');
const gasPriceSitemapUrls = await getGasPriceSitemapUrls(SITE);

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
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '');
        const isCompactRoadAlias = /^\/route\/[amr]\d+$/.test(path);
        const isLegacyRoadAlias = /^\/route\/m-(?:6|18|20|29|51|52|53|54|55|56|58|60)$/.test(path);
        return !isCompactRoadAlias && !isLegacyRoadAlias;
      },
      // Городские маршруты работают через SSR, поэтому в pages их нет.
      customPages: [...getCitySitemapUrls(SITE), ...gasPriceSitemapUrls],
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
