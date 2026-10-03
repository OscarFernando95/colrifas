import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dinamicascolrifas.com',
  // Genera /como-funciona.html (no /como-funciona/) para conservar las URLs ya indexadas.
  build: { format: 'file' },
  trailingSlash: 'ignore',
  compressHTML: true,
  devToolbar: { enabled: false },
});
