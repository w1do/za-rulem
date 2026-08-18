/** Встраиваемый чат читает остальные настройки, но всегда остаётся в городе страницы. */
export const lockChatPrefsToCity = <T extends { city: string }>(prefs: T, city: string): T => ({
	...prefs,
	city,
});
