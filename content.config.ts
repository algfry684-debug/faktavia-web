import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const berita = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/berita' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['Nasional', 'Ekonomi', 'Teknologi', 'Gaya Hidup', 'Olahraga', 'Cek Fakta']),
    date: z.coerce.date(),
    author: z.string().default('Redaksi Faktavia'),
    image: z.string().optional(),
    imageCaption: z.string().optional(),
    featured: z.boolean().default(false),
    popular: z.boolean().default(false),
    verdict: z.enum(['HOAKS', 'FAKTA', 'MENYESATKAN']).optional(),
    draft: z.boolean().default(false),
  }),
});

const halaman = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/halaman' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const INSIDEN_JENIS = ['Demo', 'Kebakaran', 'Banjir', 'Gempa', 'Longsor', 'Bencana Lain', 'Kecelakaan', 'Keamanan', 'Lainnya'] as const;

// Catatan insiden untuk halaman Sitrep. Diisi redaksi lewat admin.
const insiden = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insiden' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(INSIDEN_JENIS),
    status: z.enum(['Dipantau', 'Terverifikasi', 'Mereda']).default('Dipantau'),
    severity: z.enum(['Rendah', 'Sedang', 'Tinggi']).default('Sedang'),
    place: z.string(),
    province: z.string().optional(),
    lat: z.number().min(-12).max(7),
    lng: z.number().min(94).max(142),
    time: z.coerce.date(),
    description: z.string(),
    sourceName: z.string().optional(),
    sourceUrl: z.string().optional(),
    relatedArticle: z.string().optional(),
    hidden: z.boolean().default(false),
  }),
});

export const collections = { berita, halaman, insiden };
