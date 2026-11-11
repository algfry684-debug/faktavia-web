// Peringatan dini cuaca (nowcast) BMKG. Sumber: BMKG.
import { getText, parseRss, send } from './_lib.js';

export default async function handler(req, res) {
  try {
    const xml = await getText('https://www.bmkg.go.id/alerts/nowcast/id', 9000);
    const items = parseRss(xml);
    send(res, 200, {
      source: 'BMKG',
      fetchedAt: Date.now(),
      total: items.length,
      items: items.slice(0, 60),
    }, 's-maxage=180, stale-while-revalidate=600');
  } catch (e) {
    send(res, 502, { error: 'Peringatan dini BMKG tidak dapat dimuat' });
  }
}
