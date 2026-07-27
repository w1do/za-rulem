import { createDirectus, rest, realtime } from '@directus/sdk';

const url = import.meta.env.PUBLIC_DIRECTUS_URL || 'https://api.za-rulem.org';

// Realtime-адрес SDK строит сам: протокол http(s) → ws(s) и обязательный путь /websocket.
// Не передаём url вручную, иначе путь /websocket теряется и соединение падает по таймауту.
export const directus = createDirectus(url)
  .with(rest())
  .with(realtime({
    authMode: 'public'
  }));
