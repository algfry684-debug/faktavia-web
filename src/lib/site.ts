import { getCollection } from 'astro:content';

export const KATEGORI = ['Nasional', 'Ekonomi', 'Teknologi', 'Gaya Hidup', 'Olahraga', 'Cek Fakta'] as const;
export type Kategori = (typeof KATEGORI)[number];

export const CAT_SLUG: Record<Kategori, string> = {
  'Nasional': 'nasional',
  'Ekonomi': 'ekonomi',
  'Teknologi': 'teknologi',
  'Gaya Hidup': 'gaya-hidup',
  'Olahraga': 'olahraga',
  'Cek Fakta': 'cek-fakta',
};

export const CAT_CLASS: Record<Kategori, string> = {
  'Nasional': 'g-nasional',
  'Ekonomi': 'g-ekonomi',
  'Teknologi': 'g-teknologi',
  'Gaya Hidup': 'g-gaya',
  'Olahraga': 'g-olahraga',
  'Cek Fakta': 'g-cekfakta',
};

export const SLUG_TO_CAT = Object.fromEntries(
  Object.entries(CAT_SLUG).map(([cat, slug]) => [slug, cat])
) as Record<string, Kategori>;

/** Semua berita yang sudah terbit (bukan draft), terbaru di atas. */
export async function getPosts() {
  const all = await getCollection('berita', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const postUrl = (id: string) => `/berita/${id}/`;
export const catUrl = (cat: Kategori) => `/kategori/${CAT_SLUG[cat]}/`;

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d);
}

export function fmtDateTime(d: Date) {
  const tgl = fmtDate(d);
  const jam = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })
    .format(d).replace('.', ':');
  return `${tgl}, ${jam} WIB`;
}

export function readMinutes(body?: string) {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
