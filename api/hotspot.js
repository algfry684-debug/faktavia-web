// Titik panas (hotspot) satelit NASA FIRMS untuk wilayah Indonesia.
// Kunci API dibaca dari Environment Variable FIRMS_MAP_KEY di Vercel. Tidak pernah dikirim ke browser.
import { getText, send } from './_lib.js';

const BBOX = '94.5,-11.5,141.5,6.5'; // barat,selatan,timur,utara
const SATELLITE = 'VIIRS_SNPP_NRT';

export default async function handler(req, res) {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return send(res, 503, { error: 'FIRMS_MAP_KEY belum diatur di Vercel' });
  try {
    const csv = await getText(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${SATELLITE}/${BBOX}/2`, 15000);
    const lines = csv.trim().split(/\r?\n/);
    if (!lines.length || !/^latitude,/i.test(lines[0])) throw new Error('format');
    const head = lines[0].split(',');
    const ix = (n) => head.indexOf(n);
    const iLat = ix('latitude'), iLon = ix('longitude'), iDate = ix('acq_date'), iTime = ix('acq_time');
    const iConf = ix('confidence'), iFrp = ix('frp');
    const pts = [];
    let low = 0;
    for (const ln of lines.slice(1)) {
      const c = ln.split(',');
      const conf = (c[iConf] || '').toLowerCase();
      if (conf === 'l' || conf === 'low') { low++; continue; }
      const hhmm = String(c[iTime] || '0000').padStart(4, '0');
      const t = Date.parse(`${c[iDate]}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`);
      const lat = Number(c[iLat]), lon = Number(c[iLon]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      pts.push([+lat.toFixed(3), +lon.toFixed(3), +(Number(c[iFrp]) || 0).toFixed(1), Number.isFinite(t) ? t : null, conf]);
    }
    pts.sort((a, b) => b[2] - a[2]);
    send(res, 200, {
      source: 'NASA FIRMS (VIIRS S-NPP)',
      fetchedAt: Date.now(),
      total: pts.length,
      lowConfidenceHidden: low,
      points: pts.slice(0, 1500),
    }, 's-maxage=900, stale-while-revalidate=1800');
  } catch (e) {
    send(res, 502, { error: 'Data titik panas NASA FIRMS tidak dapat dimuat' });
  }
}
