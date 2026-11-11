// Wire berita: hanya judul + tautan + sumber dari RSS publik media. Isi berita tidak disalin.
import { getText, parseRss, send } from './_lib.js';

const FEEDS = [
  { src: 'ANTARA', url: 'https://www.antaranews.com/rss/terkini.xml' },
  { src: 'CNN Indonesia', url: 'https://www.cnnindonesia.com/nasional/rss' },
  { src: 'Republika', url: 'https://republika.co.id/rss' },
];

const TAGS = [
  ['demo', /\b(demo|demonstran|demonstrasi|unjuk rasa|aksi massa|ricuh|bentrok|barikade|water cannon|gas air mata)\b/i],
  ['kebakaran', /\b(kebakaran|terbakar|karhutla|api melahap|hangus|titik panas)\b/i],
  ['banjir', /\b(banjir|genangan|pintu air|luapan|bendungan jebol|siaga banjir)\b/i],
  ['bencana', /\b(gempa|tsunami|longsor|erupsi|gunung api|puting beliung|angin kencang|cuaca ekstrem|bencana|bnpb|bpbd|basarnas|tanah bergerak|abrasi)\b/i],
];

export default async function handler(req, res) {
  const jobs = await Promise.allSettled(FEEDS.map((f) => getText(f.url, 8000)));
  const items = [];
  const ok = [];
  jobs.forEach((j, i) => {
    if (j.status !== 'fulfilled') return;
    ok.push(FEEDS[i].src);
    for (const it of parseRss(j.value)) {
      const tags = TAGS.filter(([, re]) => re.test(it.title)).map(([n]) => n);
      items.push({ title: it.title, link: it.link, t: it.t, src: FEEDS[i].src, tags });
    }
  });
  if (!items.length) return send(res, 502, { error: 'RSS media tidak dapat dimuat' });
  const seen = new Set();
  const list = items
    .filter((x) => (seen.has(x.link) ? false : seen.add(x.link)))
    .sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
    .slice(0, 80);
  send(res, 200, { fetchedAt: Date.now(), sources: ok, items: list }, 's-maxage=120, stale-while-revalidate=300');
}
