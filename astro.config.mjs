// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Le site est publié sur GitHub Pages. `SITE` et `BASE` sont injectés par le
// workflow de déploiement : en local, on garde la racine pour que les liens
// absolus restent cliquables sans reconfiguration.
const site = process.env.SITE ?? 'https://flowmetrik.github.io';
const base = process.env.BASE ?? '/proptech-atlas';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
