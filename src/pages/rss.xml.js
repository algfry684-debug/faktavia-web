import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('berita', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 30);
  return rss({
    title: 'Faktavia.id',
    description: 'Fakta dulu, baru viral. Portal berita Indonesia.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/berita/${p.id}/`,
      categories: [p.data.category],
    })),
    customData: '<language>id-id</language>',
  });
}
