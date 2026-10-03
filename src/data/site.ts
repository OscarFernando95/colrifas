export const SITE = {
  name: 'COLRIFAS',
  url: 'https://dinamicascolrifas.com',
  locale: 'es_CO',
  // Único lugar donde vive el enlace del grupo: todos los botones lo leen de aquí.
  whatsappUrl: 'https://chat.whatsapp.com/G9SYmPPYsz80um4FezZQlo',
  gtmId: 'GTM-WZCX9K8X',
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
