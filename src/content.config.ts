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

export const collections = { berita, halaman };
