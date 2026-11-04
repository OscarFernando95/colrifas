import content from './content.json';

export const SITE = {
  name: 'COLRIFAS',
  url: 'https://dinamicascolrifas.com',
  locale: 'es_CO',
  // El enlace del grupo vive en content.json (se edita desde /admin): todos los botones lo leen de aquí.
  whatsappUrl: content.whatsappUrl,
  // Contenedores de Google Tag Manager: se cargan todos en cada página.
  gtmIds: ['GTM-WZCX9K8X', 'GTM-T3S7C6KH'],
  ogImage: '/img/og-colrifas.jpg',
  logo: '/img/logo-colrifas-completo.png',
  social: {
    instagram: 'https://www.instagram.com/_colrifas_/',
    facebook: 'https://www.facebook.com/Colrifas',
    tiktok: 'https://www.tiktok.com/@colrifas4',
  },
} as const;

export const NAV = [
  { href: '/como-funciona.html', label: 'Cómo funciona' },
  { href: '/preguntas-frecuentes.html', label: 'Preguntas' },
  { href: '/terminos-y-condiciones.html', label: 'Términos' },
] as const;
