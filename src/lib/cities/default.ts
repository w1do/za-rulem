// Server-only точка импорта. Клиент получает slug через сериализованный props,
// чтобы приватная env-переменная не попадала в browser bundle.
export { DEFAULT_CITY_SLUG } from './config';
