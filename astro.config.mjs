// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import llms from 'astro-llms-md';

import node from '@astrojs/node';


// https://astro.build/config
export default defineConfig({
  site: 'https://za-rulem.ru',
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date(),
    }),
    llms({
      name: 'За рулём — техпомощь на дороге в Тюмени',
      description:
        'Круглосуточная автопомощь на дороге в Тюмени и области: прикурить авто, замена аккумулятора, отогрев машины, вскрытие автомобиля и подвоз топлива. Выезд 24/7 за 20–40 минут.',
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
  ],

  adapter: node({
    mode: 'standalone',
  }),
});