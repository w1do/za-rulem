// Узел n8n "Aggregate snapshots" воркфлоу workflows/Za Rulem - gas prices by all (stations + areas).json.
// Правится здесь, затем переносится в JSON командой `npm run workflow:sync`.
// Блок брендов повторяет src/features/gas-prices/model/brandSlug.ts: n8n не умеет импортировать модули проекта.
const CYR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
const CANONICAL = { 'лукойл': 'lukoil', 'lukoyl': 'lukoil', 'теболойл': 'teboil', 'газойл': 'gazoil', 'калина-ойл': 'kalina-oil', 'калина ойл': 'kalina-oil', 'топлайн': 'topline', 'флэш': 'flash', 'флеш': 'flash', 'ирбис': 'irbis', 'атан': 'atan', 'кондор': 'kondor', 'сигнал': 'signal', 'газпромнефть': 'gazpromneft', 'газпром нефть': 'gazpromneft' };
const GENERIC = /[\s,-]*(?:азс|азк|агзс|агнкс|автозаправочная станция|автозаправочный комплекс|заправочная станция|заправка)$/iu;
const toLatin = (value) => {
  let result = '';
  for (const char of String(value || '').toLowerCase()) result += CYR[char] !== undefined ? CYR[char] : char;
  return result.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};
const brandSlugOf = (value) => {
  const cleaned = String(value || '').toLowerCase().replaceAll('ё', 'е').replace(/[«»"']/g, '').replace(GENERIC, '').trim();
  if (!cleaned) return '';
  return CANONICAL[cleaned] || CANONICAL[toLatin(cleaned)] || toLatin(cleaned);
};
const stationBrandSlug = (station) => brandSlugOf((station && station.brand) || String((station && station.name) || '').split(',')[0]) || 'azs';

const WEEK_MS = 604800000;
const output = [];
for (const input of $input.all()) {
  const x = input.json;
  const now = Date.now();
  const groups = new Map();
  for (const it of Array.isArray(x.stations) ? x.stations : []) {
    const s = it && it.station;
    if (!s || !Array.isArray(it.prices)) continue;
    const slug = stationBrandSlug(s);
    if (!slug) continue;
    const group = groups.get(slug) || { slug, count: 0, tz: Number(s.timezone_offset) || 3, prices: new Map() };
    group.count += 1;
    for (const q of it.prices) {
      const price = Number(q.price);
      const updatedAt = Date.parse(q.updated_at);
      if (!(price > 0) || !Number.isFinite(updatedAt) || now - updatedAt > WEEK_MS) continue;
      const bucket = group.prices.get(q.fuel_type) || [];
      bucket.push({ price, updatedAt: q.updated_at });
      group.prices.set(q.fuel_type, bucket);
    }
    groups.set(slug, group);
  }

  const snapshots = [];
  for (const group of groups.values()) {
    const fuels = [...group.prices].map(([fuelType, bucket]) => ({
      fuelType,
      average: Number((bucket.reduce((sum, q) => sum + q.price, 0) / bucket.length).toFixed(2)),
      min: Math.min(...bucket.map((q) => q.price)),
      max: Math.max(...bucket.map((q) => q.price)),
      sampleCount: bucket.length,
      updatedAt: bucket.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0].updatedAt
    }));
    if (!fuels.length) continue;
    const localDate = new Date(now + group.tz * 3600000);
    localDate.setUTCMinutes(localDate.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
    snapshots.push({
      area_type: x.area.type,
      area_slug: x.area.slug,
      area_parent_slug: x.area.parent || null,
      brand_slug: group.slug,
      snapshot_date: localDate.toISOString().slice(0, 19) + 'Z',
      station_count: group.count,
      source_updated_at: fuels.map((f) => f.updatedAt).sort().at(-1),
      fuel_prices: fuels
    });
  }
  output.push({ json: { ...x, snapshots } });
}
return output;
