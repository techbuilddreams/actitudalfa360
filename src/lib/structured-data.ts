import { copy } from '@/content';
import { site } from '@/config/site';
import { toDecimalString, usd } from '@/domain/money';
import { defaultVariant, type Faq, type Product } from '@/domain/product';

/** Constructores de schema.org: una sola implementación para todas las páginas (DRY). */
const abs = (path: string) => `${site.url}${path}`;
const ORG_ID = abs('/#org');

/**
 * Refleja la política REAL: hecho a pedido ⇒ sin devoluciones por cambio de opinión.
 * (Lo dañado/defectuoso se reemplaza o reembolsa: es una garantía, no una devolución.)
 * Declarar "devoluciones gratis 30 días" sería publicidad engañosa para Google Merchant Center.
 */
const returnPolicy = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'US',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
  url: abs('/politicas#devoluciones'),
};

const shippingDetails = (flatCents: number) => ({
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: toDecimalString(usd(flatCents)), currency: 'USD' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: site.shipping.handlingDays.min, maxValue: site.shipping.handlingDays.max, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: site.shipping.transitDays.min, maxValue: site.shipping.transitDays.max, unitCode: 'DAY' },
  },
});

/**
 * «calle, ciudad, ST 12345, país» ⇒ PostalAddress. Ilegible o null ⇒ null: se omite, no se inventa.
 * (`site.postalAddress` es una sola cadena; el pie la muestra tal cual.)
 */
export function parsePostalAddress(raw: string | null) {
  if (!raw) return null;
  const parts = raw.split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length < 4) return null;
  const country = parts[parts.length - 1];
  const stateZip = /^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(parts[parts.length - 2]);
  if (!stateZip) return null;
  return {
    '@type': 'PostalAddress',
    streetAddress: parts.slice(0, -3).join(', '),
    addressLocality: parts[parts.length - 3],
    addressRegion: stateZip[1],
    postalCode: stateZip[2],
    addressCountry: country === 'United States' ? 'US' : country,
  };
}

/** Oferta vigente hasta el 31 de dic del año SIGUIENTE (UTC): siempre ≥ 12 meses de margen. Pura: el reloj entra por parámetro. */
export const priceValidUntil = (now: Date): string => `${now.getUTCFullYear() + 1}-12-31`;

export const organizationLd = () => {
  const address = parsePostalAddress(site.postalAddress);
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.name,
    legalName: site.legalName,
    ...(address ? { address } : {}),
    url: site.url,
    logo: abs('/img/icon-512.png'),
    email: site.email,
    slogan: copy.organization.slogan,
    description: copy.organization.description,
    parentOrganization: { '@type': 'Organization', name: site.legalName },
    hasMerchantReturnPolicy: returnPolicy,
  };
};

export const websiteLd = () => ({ '@type': 'WebSite', '@id': abs('/#web'), url: site.url, name: site.name, inLanguage: 'es-US', publisher: { '@id': ORG_ID } });

export const productLd = (p: Product, shippingCents: number, now: Date) => {
  const v = defaultVariant(p);
  return {
    '@type': 'Product',
    '@id': abs(`/productos/${p.slug}#product`),
    name: p.h1,
    description: p.seo.description,
    image: p.images.map((i) => abs(i.jpg)),
    sku: v.sku,
    category: p.category,
    ...(p.material ? { material: p.material } : {}),
    ...(p.color ? { color: p.color } : {}),
    brand: { '@type': 'Brand', name: site.name },
    offers: {
      '@type': 'Offer',
      url: abs(`/productos/${p.slug}`),
      price: toDecimalString(v.price),
      priceCurrency: 'USD',
      priceValidUntil: priceValidUntil(now),
      availability: v.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': ORG_ID },
      shippingDetails: shippingDetails(shippingCents),
      hasMerchantReturnPolicy: returnPolicy,
    },
  };
};

export const faqLd = (items: readonly Faq[]) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

export const breadcrumbLd = (trail: readonly { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: abs(t.path) })),
});

/** Página genérica (p. ej. /reto-30-dias): parte del sitio, en español. */
export const webPageLd = (path: string, name: string, description: string) => ({
  '@type': 'WebPage',
  '@id': abs(`${path}#page`),
  url: abs(path),
  name,
  description,
  inLanguage: 'es-US',
  isPartOf: { '@id': abs('/#web') },
  publisher: { '@id': ORG_ID },
});

export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });
