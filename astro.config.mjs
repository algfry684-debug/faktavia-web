import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Alamat website kamu. Dipakai untuk sitemap, RSS, dan link share.
export default defineConfig({
  site: 'https://faktavia.web.id',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
