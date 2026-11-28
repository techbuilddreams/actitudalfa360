import { afterEach, describe, expect, it, vi } from 'vitest';
import { site } from '@/config/site';
import { catalog } from '@/infrastructure/container';
import { productLd } from '@/lib/structured-data';
import { escapeXml, googleCategoryFor, merchantFeedXml } from '@/lib/merchant-feed';
import type { Product } from '@/domain/product';

const SHIP = 899;
const products = catalog.all();
const xml = merchantFeedXml(products, SHIP);

/** Texto del primer `<tag>` dentro de un `<item>` concreto. */
const items = (x: string) => x.split('<item>').slice(1).map((i) => i.split('</item>')[0]);
const tag = (item: string, name: string) => new RegExp(`<${name}>([^<]*)</${name}>`).exec(item)?.[1];

describe('escapeXml', () => {
  it('escapa & < > " \' y conserva emoji y acentos', () => {
    expect(escapeXml(`a & b < c > "d" 'e' 💪 ñ`)).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos; 💪 ñ');
  });
  it('elimina caracteres de control que XML 1.0 prohíbe (no escapables)', () => {
    expect(escapeXml('a\u0000b\u000bc\u0008d\te\nf')).toBe('abcd\te\nf');
  });
});

describe('merchantFeedXml: estructura', () => {
  it('RSS 2.0 con el namespace g: y un item por producto', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">');
    expect(items(xml)).toHaveLength(products.length);
    expect(xml).toContain(`<link>${site.url}</link>`);
  });

  it.each(products.map((p) => [p.slug, p] as const))('%s: campos obligatorios de Merchant Center', (_slug, p) => {
    const item = items(xml).find((i) => tag(i, 'g:id') === p.variants[0].sku)!;
    expect(item).toBeDefined();
    expect(tag(item, 'g:title')).toBeTruthy();
    expect(tag(item, 'g:description')).toBeTruthy();
    expect(tag(item, 'g:link')).toBe(`${site.url}/productos/${p.slug}`);
    expect(tag(item, 'g:image_link')).toBe(`${site.url}${p.images[0].jpg}`);
    expect(tag(item, 'g:condition')).toBe('new');
    expect(tag(item, 'g:brand')).toBe(site.name);
    expect(tag(item, 'g:identifier_exists')).toBe('no');
    expect(tag(item, 'g:google_product_category')).toBeTruthy();
    expect(tag(item, 'g:product_type')).toBe(`${site.name} &gt; ${p.category}`);
  });

  it('imágenes extra como g:additional_image_link', () => {
    const taza = items(xml).find((i) => tag(i, 'g:id') === 'AA360-TAZA-15-NEGRA')!;
    expect(tag(taza, 'g:additional_image_link')).toBe(`${site.url}${catalog.bySlug('taza-negra-15oz')!.images[1].jpg}`);
    const vaso = items(xml).find((i) => tag(i, 'g:id') === 'AA360-VASO-20-NEGRO')!;
    expect(vaso).not.toContain('additional_image_link');
  });

  it('envío: EE. UU., plano, con plazos de site.shipping', () => {
    const item = items(xml)[0];
    const ship = /<g:shipping>([\s\S]*?)<\/g:shipping>/.exec(item)![1];
    expect(tag(ship, 'g:country')).toBe('US');
    expect(tag(ship, 'g:price')).toBe('8.99 USD');
    expect(tag(ship, 'g:min_handling_time')).toBe('2');
    expect(tag(ship, 'g:max_handling_time')).toBe('5');
    expect(tag(ship, 'g:min_transit_time')).toBe('3');
    expect(tag(ship, 'g:max_transit_time')).toBe('7');
  });

  it('material y color cuando el catálogo los da', () => {
    const item = items(xml)[0];
    expect(tag(item, 'g:material')).toBe('Cerámica');
    expect(tag(item, 'g:color')).toBe('Negro');
  });

  it('todos los productos del catálogo tienen categoría de Google', () => {
    for (const p of products) expect(googleCategoryFor(p)).toMatch(/^Home & Garden > /);
  });
});

describe('merchantFeedXml: escapado y disponibilidad', () => {
  const evil: Product = {
    ...products[0],
    h1: 'Taza "Alfa" & <Co> 💪',
    seo: { ...products[0].seo, description: `Dura > todo & más <b>'sí'</b>` },
    variants: [{ ...products[0].variants[0], available: false }],
  };
  const out = merchantFeedXml([evil], SHIP);

  it('título y descripción escapados; sin marcado crudo', () => {
    expect(out).toContain('<g:title>Taza &quot;Alfa&quot; &amp; &lt;Co&gt; 💪</g:title>');
    expect(out).toContain('&lt;b&gt;&apos;sí&apos;&lt;/b&gt;');
    expect(out).not.toContain('<b>');
  });

  it('no disponible ⇒ out_of_stock', () => {
    expect(tag(out, 'g:availability')).toBe('out_of_stock');
  });

  it('URLs con & se escapan también', () => {
    const p: Product = { ...products[0], images: [{ ...products[0].images[0], jpg: '/img/a.jpg?x=1&y=2' }] };
    expect(merchantFeedXml([p], SHIP)).toContain('/img/a.jpg?x=1&amp;y=2');
  });
});

describe('merchantFeedXml: valores exactos', () => {
  it('g:service exacto, país US, sin g:region', () => {
    expect(xml).toContain('<g:country>US</g:country><g:service>Standard</g:service>');
    expect(xml).not.toContain('g:region');
  });

  it('google_product_category exacta por categoría', () => {
    const cats = Object.fromEntries(products.map((p) => [p.category, googleCategoryFor(p)]));
    expect(cats['Tazas']).toBe('Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs');
    expect(cats['Vasos térmicos']).toBe('Home & Garden > Kitchen & Dining > Food & Beverage Carriers > Travel Mugs & Tumblers');
    expect(xml).toContain('<g:google_product_category>Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Tableware &gt; Drinkware &gt; Mugs</g:google_product_category>');
  });

  it('categoría sin mapa ⇒ error', () => {
    expect(() => googleCategoryFor({ ...products[0], category: 'Gorras' })).toThrow(/Gorras/);
  });

  it('más de una variante ⇒ error (la ficha solo vende la variante 0)', () => {
    const two: Product = { ...products[0], variants: [products[0].variants[0], { ...products[0].variants[0], sku: 'X-2' }] };
    expect(() => merchantFeedXml([two], SHIP)).toThrow(/variantes/);
  });

  it('escapeXml elimina surrogates sueltos y conserva pares válidos', () => {
    expect(escapeXml('a\uD83Db\uDE00c')).toBe('abc');
    expect(escapeXml('💪')).toBe('💪');
  });
});

describe('paridad feed ↔ JSON-LD (una sola verdad de precio, disponibilidad y envío)', () => {
  it.each(products.map((p) => [p.slug, p] as const))('%s', (_slug, p) => {
    const ld = productLd(p, SHIP) as { sku: string; offers: { price: string; priceCurrency: string; availability: string; shippingDetails: { shippingRate: { value: string; currency: string }; deliveryTime: { handlingTime: { minValue: number; maxValue: number }; transitTime: { minValue: number; maxValue: number } } } } };
    const item = items(xml).find((i) => tag(i, 'g:id') === ld.sku)!;
    expect(tag(item, 'g:price')).toBe(`${ld.offers.price} ${ld.offers.priceCurrency}`);
    const inStock = ld.offers.availability === 'https://schema.org/InStock';
    expect(tag(item, 'g:availability')).toBe(inStock ? 'in_stock' : 'out_of_stock');
    const ship = /<g:shipping>([\s\S]*?)<\/g:shipping>/.exec(item)![1];
    const r = ld.offers.shippingDetails.shippingRate;
    expect(tag(ship, 'g:price')).toBe(`${r.value} ${r.currency}`);
    const d = ld.offers.shippingDetails.deliveryTime;
    expect([tag(ship, 'g:min_handling_time'), tag(ship, 'g:max_handling_time'), tag(ship, 'g:min_transit_time'), tag(ship, 'g:max_transit_time')])
      .toEqual([d.handlingTime.minValue, d.handlingTime.maxValue, d.transitTime.minValue, d.transitTime.maxValue].map(String));
  });

  it('envío gratis ⇒ «0.00 USD» en ambos', () => {
    const free = merchantFeedXml(products, 0);
    expect(tag(items(free)[0], 'g:price')).toBe('24.99 USD');
    expect(free).toContain('<g:price>0.00 USD</g:price>');
  });
});

describe('GET /merchant-feed.xml', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('producción: 200, XML UTF-8, cacheable en CDN', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    vi.resetModules();
    const { GET } = await import('@/app/merchant-feed.xml/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=\d+/);
    const body = await res.text();
    expect(body).toContain('<g:id>AA360-TAZA-15-NEGRA</g:id>');
    expect(body).toContain('<g:price>8.99 USD</g:price>');
  });

  it('staging: 404 y noindex, nunca un feed', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'staging');
    vi.resetModules();
    const { GET } = await import('@/app/merchant-feed.xml/route');
    const res = await GET();
    expect(res.status).toBe(404);
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    expect(await res.text()).not.toContain('<g:id>');
  });
});
