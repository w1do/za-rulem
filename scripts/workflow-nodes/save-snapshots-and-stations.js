// Узел n8n "Save snapshots and stations" воркфлоу workflows/Za Rulem - gas prices by all (stations + areas).json.
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

/** Координата считается известной только если это конечное число в допустимом диапазоне. */
const coordinate = (value, limit) => {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) && parsed !== 0 && Math.abs(parsed) <= limit ? parsed : null;
};
const readPoint = (station) => {
  const source = station || {};
  const point = source.point || {};
  const location = source.location || {};
  const geometry = Array.isArray(source.geometry && source.geometry.coordinates) ? source.geometry.coordinates : null;
  return {
    lat: coordinate(source.lat ?? source.latitude ?? point.lat ?? location.lat ?? (geometry ? geometry[1] : null), 90),
    lng: coordinate(source.lng ?? source.lon ?? source.long ?? source.longitude ?? point.lng ?? point.lon ?? location.lng ?? location.lon ?? (geometry ? geometry[0] : null), 180)
  };
};

/**
 * 2GIS периодически отдаёт станцию без части полей. Пустое значение нельзя
 * отправлять в Directus: PATCH перезапишет уже накопленные данные (так были
 * потеряны координаты). Поэтому в payload попадают только заполненные поля.
 */
const isEmpty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
const withKnownFields = (id, fields) => {
  const payload = { id };
  for (const [key, value] of Object.entries(fields)) {
    if (!isEmpty(value)) payload[key] = value;
  }
  return payload;
};

/** Slug задаётся один раз при создании записи и дальше не перезаписывается. */
const insertStation = (station) => {
  const place = toLatin(station.address || station.name);
  const base = [station.brand, place].filter(Boolean).join('-').slice(0, 80).replace(/-+$/, '');
  return { ...station, slug: `${base || 'azs'}-${String(station.id).slice(-6)}` };
};

const output = [];
const c = $input.first().json;
const headers = { Authorization: `Bearer ${c.directusToken}`, 'Content-Type': 'application/json' };

const upsert = async (collection, data, prepareInsert) => {
  if (!data || data.length === 0) return;
  for (let i = 0; i < data.length; i += 100) {
    const batch = data.slice(i, i + 100);
    const res = await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${c.directusUrl}/items/${collection}`,
      headers,
      body: batch,
      json: true
    });
    const updatedIds = new Set((res.data || []).map((item) => String(item.id)));
    const toPost = batch.filter((item) => !updatedIds.has(String(item.id)));
    if (toPost.length > 0) {
      await this.helpers.httpRequest({
        method: 'POST',
        url: `${c.directusUrl}/items/${collection}`,
        headers,
        body: prepareInsert ? toPost.map(prepareInsert) : toPost,
        json: true
      });
    }
  }
};

for (const input of $input.all()) {
  const x = input.json;
  const areaSnapshots = [];
  const pointSnapshots = [];
  const stationUpdates = [];

  if (Array.isArray(x.snapshots)) {
    for (const s of x.snapshots) {
      areaSnapshots.push({
        id: `${s.area_type}:${s.area_slug}:${s.brand_slug}:${s.snapshot_date}`,
        station: null,
        area_type: s.area_type,
        area_slug: s.area_slug,
        area_parent_slug: s.area_parent_slug,
        brand_slug: s.brand_slug,
        snapshot_date: s.snapshot_date,
        station_count: s.station_count,
        source_updated_at: s.source_updated_at,
        fuel_prices: s.fuel_prices
      });
    }
  }

  if (Array.isArray(x.stations)) {
    const now = new Date();
    for (const it of x.stations) {
      const s = it.station;
      if (!s || s.id === undefined || s.id === null) continue;
      const stationId = String(s.id);
      const tz = Number(s.timezone_offset || 3);
      const snapshotDate = new Date(now.getTime() + tz * 3600000);
      snapshotDate.setUTCMinutes(snapshotDate.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
      const snapshotDateStr = snapshotDate.toISOString().slice(0, 19) + 'Z';

      const brandSlug = stationBrandSlug(s);
      const point = readPoint(s);
      const queueLevel = (it.fuel_statuses || []).find((f) => f.queue_level);

      stationUpdates.push(withKnownFields(stationId, {
        name: s.name,
        brand: brandSlug,
        address: s.address,
        lat: point.lat,
        lng: point.lng,
        fuel_assortment: s.fuel_assortment || s.fuel_types,
        prices: it.prices,
        fuel_statuses: it.fuel_statuses,
        last_transaction_at: it.updated_at || s.last_transaction_at,
        status: it.status || 'open',
        closed: it.status === 'closed',
        queue_level: queueLevel ? queueLevel.queue_level : null
      }));

      if (Array.isArray(it.prices) && it.prices.length > 0) {
        pointSnapshots.push({
          id: `point:${stationId}:${snapshotDateStr}`,
          station: stationId,
          brand_slug: brandSlug,
          area_type: 'point',
          area_slug: stationId,
          area_parent_slug: (x.area && x.area.slug) || null,
          snapshot_date: snapshotDateStr,
          fuel_prices: it.prices.map((p) => ({
            fuelType: p.fuel_type,
            average: Number(p.price),
            min: Number(p.price),
            max: Number(p.price),
            sampleCount: 1,
            updatedAt: p.updated_at
          })),
          station_count: 1,
          source_updated_at: it.updated_at
        });
      }
    }
  }

  try {
    // stations must exist before gas_daily rows reference them via M2O
    await upsert('stations', stationUpdates, insertStation);
    await upsert('gas_daily', areaSnapshots);
    await upsert('gas_daily', pointSnapshots);
    output.push({ json: { area: x.area.slug, status: 'ok', stations: stationUpdates.length, snapshots: areaSnapshots.length, points: pointSnapshots.length } });
  } catch (e) {
    output.push({ json: { area: x.area.slug, status: 'error', message: e.message } });
  }
}
return output;
