// Gempa terbaru dari data terbuka BMKG. Sumber: BMKG.
import { getJson, send } from './_lib.js';

const BASE = 'https://data.bmkg.go.id/DataMKG/TEWS/';

function norm(g, felt) {
  const [lat, lon] = String(g.Coordinates || '').split(',').map(Number);
  const t = Date.parse(g.DateTime);
  const mag = Number(g.Magnitude);
  if (!Number.isFinite(t) || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) return null;
  return {
    t,
    mag,
    depth: parseInt(String(g.Kedalaman), 10) || null,
    lat,
    lon,
    wilayah: String(g.Wilayah || ''),
    potensi: String(g.Potensi || ''),
    dirasakan: g.Dirasakan ? String(g.Dirasakan) : null,
    felt,
  };
}

export default async function handler(req, res) {
  const jobs = await Promise.allSettled([
    getJson(BASE + 'autogempa.json'),
    getJson(BASE + 'gempaterkini.json'),
    getJson(BASE + 'gempadirasakan.json'),
  ]);
  const items = [];
  const [a, b, c] = jobs;
  if (a.status === 'fulfilled' && a.value?.Infogempa?.gempa) {
    const g = a.value.Infogempa.gempa;
    for (const x of Array.isArray(g) ? g : [g]) items.push(norm(x, !!x.Dirasakan));
  }
  if (b.status === 'fulfilled') for (const x of b.value?.Infogempa?.gempa ?? []) items.push(norm(x, false));
  if (c.status === 'fulfilled') for (const x of c.value?.Infogempa?.gempa ?? []) items.push(norm(x, true));

  const seen = new Map();
  for (const it of items) {
    if (!it) continue;
    const k = it.t + '|' + it.lat + '|' + it.lon;
    const prev = seen.get(k);
    if (!prev) seen.set(k, it);
    else if (it.felt) prev.felt = true;
  }
  const list = [...seen.values()].sort((x, y) => y.t - x.t).slice(0, 40);
  if (!list.length) return send(res, 502, { error: 'Data BMKG tidak dapat dibaca' });
  send(res, 200, { source: 'BMKG', fetchedAt: Date.now(), items: list }, 's-maxage=60, stale-while-revalidate=300');
}
