// Tren pencarian Google untuk Indonesia (BUKAN tren X). Sumber: Google Trends RSS.
import { getText, decodeXml, safeUrl, send } from './_lib.js';

function tag(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? decodeXml(m[1]) : '';
}

export default async function handler(req, res) {
  try {
    const xml = await getText('https://trends.google.com/trending/rss?geo=ID', 9000);
    const items = [];
    const re = /<item[\s>][\s\S]*?<\/item>/gi;
    let m;
    while ((m = re.exec(xml))) {
      const b = m[0];
      const q = tag(b, 'title');
      if (!q) continue;
      const t = Date.parse(tag(b, 'pubDate'));
      const nb = (b.match(/<ht:news_item>[\s\S]*?<\/ht:news_item>/i) || [''])[0];
      items.push({
        q,
        traffic: tag(b, 'ht:approx_traffic'),
        t: Number.isFinite(t) ? t : null,
        news: nb ? { title: tag(nb, 'ht:news_item_title'), url: safeUrl(tag(nb, 'ht:news_item_url')), src: tag(nb, 'ht:news_item_source') } : null,
      });
    }
    if (!items.length) throw new Error('kosong');
    send(res, 200, { source: 'Google Trends', fetchedAt: Date.now(), items: items.slice(0, 20) }, 's-maxage=600, stale-while-revalidate=1200');
  } catch {
    send(res, 502, { error: 'Tren pencarian tidak dapat dimuat' });
  }
}
