import { site } from '@/config/site';
import { toDecimalString, usd } from '@/domain/money';
import { defaultVariant, type Product } from '@/domain/product';

/**
 * Feed de Google Merchant Center (RSS 2.0 + namespace g:). Función pura: productos + envío ⇒ XML.
 * Precio, disponibilidad y envío salen de las MISMAS constantes que el JSON-LD (`productLd`);
 * `tests/merchant-feed.test.ts` comprueba la paridad producto por producto.
 */

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/** Escapa texto/atributo XML y quita los caracteres de control que XML 1.0 prohíbe (ni escapados son válidos). */
export const escapeXml = (s: string): string =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/[&<>"']/g, (c) => XML_ENTITIES[c]);

const GOOGLE_CATEGORY_BY_CATALOG_CATEGORY: Record<string, string> = {
  'Tazas': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
  'Vasos térmicos': 'Home & Garden > Kitchen & Dining > Food & Beverage Carriers > Travel Mugs & Tumblers',
};

/** Taxonomía de Google por categoría del catálogo. Producto sin mapa ⇒ error (mejor que un feed con categoría errónea). */
export function googleCategoryFor(p: Product): string {
  const c = GOOGLE_CATEGORY_BY_CATALOG_CATEGORY[p.category];
  if (!c) throw new Error(`Sin categoría de Google para «${p.category}» (${p.slug})`);
  return c;
}

const el = (name: string, value: string | number) => `<${name}>${escapeXml(String(value))}</${name}>`;
const abs = (path: string) => `${site.url}${path}`;

function itemXml(p: Product, shippingCents: number): string {
  const v = defaultVariant(p);
  const { handlingDays: h, transitDays: t } = site.shipping;
  const lines = [
    el('g:id', v.sku),
    el('g:title', p.h1),
    el('g:description', p.seo.description),
    el('g:link', abs(`/productos/${p.slug}`)),
    el('g:image_link', abs(p.images[0].jpg)),
    ...p.images.slice(1).map((i) => el('g:additional_image_link', abs(i.jpg))),
    el('g:availability', v.available ? 'in_stock' : 'out_of_stock'),
    el('g:price', `${toDecimalString(v.price)} USD`),
    el('g:condition', 'new'),
    el('g:brand', site.name),
    el('g:identifier_exists', 'no'),
    el('g:google_product_category', googleCategoryFor(p)),
    el('g:product_type', `${site.name} > ${p.category}`),
    ...(p.material ? [el('g:material', p.material)] : []),
    ...(p.color ? [el('g:color', p.color)] : []),
    `<g:shipping>${[
      el('g:country', 'US'),
      el('g:service', 'Standard'),
      el('g:price', `${toDecimalString(usd(shippingCents))} USD`),
      el('g:min_handling_time', h.min),
      el('g:max_handling_time', h.max),
      el('g:min_transit_time', t.min),
      el('g:max_transit_time', t.max),
    ].join('')}</g:shipping>`,
  ];
  return `<item>${lines.join('')}</item>`;
}

export function merchantFeedXml(products: readonly Product[], shippingCents: number): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>' +
    el('title', site.name) +
    el('link', site.url) +
    el('description', `Catálogo de ${site.name}`) +
    products.map((p) => itemXml(p, shippingCents)).join('') +
    '</channel></rss>\n'
  );
}
