import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Las páginas son estáticas; solo /admin y /api/admin se ejecutan en el servidor.
  adapter: vercel(),
  site: 'https://dinamicascolrifas.com',
  // Genera /como-funciona.html (no /como-funciona/) para conservar las URLs ya indexadas.
  build: { format: 'file' },
  trailingSlash: 'ignore',
  compressHTML: true,
  devToolbar: { enabled: false },
});
