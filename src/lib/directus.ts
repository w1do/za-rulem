import { createDirectus, rest, realtime } from '@directus/sdk';

const url = import.meta.env.PUBLIC_DIRECTUS_URL || 'https://api.za-rulem.org';

// WebSocket URL должен использовать wss:// для https и ws:// для http
const wsUrl = url.replace(/^http/, 'ws');

export const directus = createDirectus(url)
  .with(rest())
  .with(realtime({
    authMode: 'public'
  }));
