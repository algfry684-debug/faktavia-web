// Fungsi bantu untuk semua endpoint /api/*. File berawalan "_" tidak jadi endpoint.
export const UA = 'FaktaviaSitrep/1.0 (+https://faktavia.web.id)';

export async function getText(url, timeoutMs = 8000) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

export async function getJson(url, timeoutMs = 8000) {
  return JSON.parse(await getText(url, timeoutMs));
}

export function send(res, status, body, cache = 's-maxage=60, stale-while-revalidate=300') {
  res.setHeader('Cache-Control', status === 200 ? cache : 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(body));
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodeXml(s = '') {
  return String(s)
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? decodeXml(m[1]) : '';
}

export function safeUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : '';
  } catch {
    return '';
  }
}

/** Baca RSS 2.0 sederhana: hanya judul, tautan, dan waktu terbit. */
export function parseRss(xml) {
  const out = [];
  const re = /<item[\s>][\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[0];
    const title = tag(b, 'title');
    const link = safeUrl(tag(b, 'link') || tag(b, 'guid'));
    const d = Date.parse(tag(b, 'pubDate') || tag(b, 'dc:date') || '');
    if (title && link) out.push({ title, link, t: Number.isFinite(d) ? d : null });
  }
  return out;
}
