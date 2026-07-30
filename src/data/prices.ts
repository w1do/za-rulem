export const FUEL_PRICE_PER_LITER = 85;
export const DEPARTURE_PRICE_PER_KM = 330;
export const SERVICE_FEE = 4300;
export const MIN_FUEL_LITERS = 20;

/**
 * Минимальная стоимость выезда, включающая базовый сервис и минимальный объем топлива.
 * В текущей конфигурации: 4300 (сервис) + 20 (литров) * 85 (цена за литр) = 6000 ₽.
 */
export const MIN_TOTAL_PRICE = SERVICE_FEE + MIN_FUEL_LITERS * FUEL_PRICE_PER_LITER;
