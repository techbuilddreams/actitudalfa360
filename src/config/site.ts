/** Datos públicos de la marca: una sola fuente de verdad (DRY). */
export const site = {
  name: 'Actitud Alfa 360',
  legalName: 'Tech Build Dreams LLC',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://actitudalfa360.com').replace(/\/$/, ''),
  email: 'hola@actitudalfa360.com',
  locale: 'es_US',
  lang: 'es',
  slogan: 'Háblame de hacer dinero, no de gente.',
  themeColor: '#0E0E0D',
  isStaging: process.env.NEXT_PUBLIC_APP_ENV === 'staging',
  shipping: {
    countries: ['US'] as const,
    handlingDays: { min: 2, max: 5 },
    transitDays: { min: 3, max: 7 },
  },
  returns: { days: 30 },
  /** Imagen para compartir (1200×630). Cada página con openGraph propio la repite: Next no la hereda del layout. */
  ogImage: { url: '/img/og.jpg', width: 1200, height: 630 },
  /** Duración del reto (días de calendario). */
  challenge: { days: 30 },
  /** Membresía: aún no se vende (decisión 10). El precio se muestra como «próximamente». */
  membership: { priceCents: 1200 },
  /** Dirección postal para el pie (CAN-SPAM): la de la LLC, dada por Luis el 2026-11-28. */
  postalAddress: '2125 Biscayne Blvd, Ste 204, Miami, FL 33137, United States' as string | null,
} as const;

export const deliveryPromise =
  `Se produce en ${site.shipping.handlingDays.min}–${site.shipping.handlingDays.max} días hábiles · ` +
  `entrega en ${site.shipping.transitDays.min}–${site.shipping.transitDays.max} días hábiles (EE. UU.)`;
