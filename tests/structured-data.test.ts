import { describe, expect, it, vi } from 'vitest';
import { site } from '@/config/site';
import { catalog } from '@/infrastructure/container';
import { copy } from '@/content';
import { faqLd, organizationLd, productLd } from '@/lib/structured-data';
import { formatPostalAddress } from '@/domain/postal-address';

const taza = catalog.bySlug('taza-negra-15oz')!;

type Offer = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('productLd: lo que ya publicábamos', () => {
  const ld = productLd(taza, 899) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const offer = ld.offers as Offer;

  it('Product con sku, marca e imágenes absolutas', () => {
    expect(ld['@type']).toBe('Product');
    expect(ld.sku).toBe('AA360-TAZA-15-NEGRA');
    expect(ld.image.every((u: string) => u.startsWith(`${site.url}/img/`))).toBe(true);
  });

  it('Offer: precio decimal en USD, en stock, nuevo', () => {
    expect(offer.price).toBe('24.99');
    expect(offer.priceCurrency).toBe('USD');
    expect(offer.availability).toBe('https://schema.org/InStock');
    expect(offer.itemCondition).toBe('https://schema.org/NewCondition');
  });

  it('envío plano, plazos de site.shipping', () => {
    const s = offer.shippingDetails;
    expect(s.shippingRate).toEqual({ '@type': 'MonetaryAmount', value: '8.99', currency: 'USD' });
    expect(s.deliveryTime.handlingTime).toMatchObject({ minValue: 2, maxValue: 5 });
    expect(s.deliveryTime.transitTime).toMatchObject({ minValue: 3, maxValue: 7 });
  });

  it('devolución: NO permitida (hecho a pedido). No cambiar sin cambiar la política.', () => {
    expect(offer.hasMerchantReturnPolicy.returnPolicyCategory).toBe('https://schema.org/MerchantReturnNotPermitted');
  });

  it('envío 0 ⇒ "0.00", no vacío', () => {
    expect((productLd(taza, 0) as Offer).offers.shippingDetails.shippingRate.value).toBe('0.00');
  });
});

describe('productLd: campos nuevos', () => {
  it('NO emite priceValidUntil (choca con «precios pueden cambiar sin aviso»)', () => {
    expect('priceValidUntil' in (productLd(taza, 899) as Offer).offers).toBe(false);
  });

  it('material y color salen del catálogo', () => {
    const ld = productLd(taza, 899) as Offer;
    expect(ld.material).toBe('Cerámica');
    expect(ld.color).toBe('Negro');
    const vaso = productLd(catalog.bySlug('vaso-termico-20oz')!, 899) as Offer;
    expect(vaso.material).toBe('Acero inoxidable');
    expect(vaso.color).toBe('Negro');
  });

  it('un producto sin material/color no emite las claves', () => {
    const bare = { ...taza, material: undefined, color: undefined };
    const ld = productLd(bare, 899) as Offer;
    expect('material' in ld).toBe(false);
    expect('color' in ld).toBe(false);
  });
});

describe('organizationLd', () => {
  const org = organizationLd() as Offer;

  it('legalName de la LLC y dirección postal de site.postalAddress', () => {
    expect(org.legalName).toBe('Tech Build Dreams LLC');
    expect(org.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '2125 Biscayne Blvd, Ste 204',
      addressLocality: 'Miami',
      addressRegion: 'FL',
      postalCode: '33137',
      addressCountry: 'US',
    });
  });

  it('sin dirección ⇒ sin address; sin parentOrganization (contradice legalName)', async () => {
    expect('parentOrganization' in org).toBe(false);
    vi.resetModules();
    vi.doMock('@/config/site', async (orig) => ({ site: { ...((await orig()) as { site: object }).site, postalAddress: null } }));
    const { organizationLd: o2 } = await import('@/lib/structured-data');
    expect('address' in (o2() as Offer)).toBe(false);
    vi.doUnmock('@/config/site');
  });

  it('formatPostalAddress: la cadena del pie no cambia', () => {
    expect(formatPostalAddress(site.postalAddress!)).toBe('2125 Biscayne Blvd, Ste 204, Miami, FL 33137, United States');
  });
});

describe('/reto-30-dias publica su FAQ como FAQPage', () => {
  it('el grafo de la página incluye FAQPage con las preguntas del copy', async () => {
    const { default: RetoPage } = await import('@/app/reto-30-dias/page');
    const tree = RetoPage() as { props: { children: { props: { data?: { '@graph': { '@type': string; mainEntity?: unknown[] }[] } } }[] } };
    const graph = tree.props.children[0].props.data!['@graph'];
    const faq = graph.find((n) => n['@type'] === 'FAQPage');
    expect(faq?.mainEntity).toHaveLength(copy.reto.faq.length);
  });
});

describe('faqLd', () => {
  it('FAQPage con una Question por pregunta del reto', () => {
    const ld = faqLd(copy.reto.faq) as Offer;
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(copy.reto.faq.length);
    expect(ld.mainEntity[0]).toMatchObject({ '@type': 'Question', name: copy.reto.faq[0].q });
  });
});

describe('productLd: valores exactos que antes sobrevivían a mutantes', () => {
  const ld = productLd(taza, 899) as Offer;
  const offer = ld.offers as Offer;

  it('país de envío y de devolución = US; URL de devoluciones; unitCode DAY', () => {
    expect(offer.shippingDetails.shippingDestination).toEqual({ '@type': 'DefinedRegion', addressCountry: 'US' });
    expect(offer.hasMerchantReturnPolicy.applicableCountry).toBe('US');
    expect(offer.hasMerchantReturnPolicy.url).toBe(`${site.url}/politicas#devoluciones`);
    expect(offer.shippingDetails.deliveryTime.handlingTime.unitCode).toBe('DAY');
    expect(offer.shippingDetails.deliveryTime.transitTime.unitCode).toBe('DAY');
  });

  it('seller = @id de la Organization; offers.url = URL del producto; @id del producto', () => {
    expect(offer.seller).toEqual({ '@id': (organizationLd() as Offer)['@id'] });
    expect(offer.url).toBe(`${site.url}/productos/taza-negra-15oz`);
    expect(ld['@id']).toBe(`${site.url}/productos/taza-negra-15oz#product`);
  });
});

describe('catálogo: el precio no vive en el texto', () => {
  it.each(catalog.all().map((p) => [p.slug, p] as const))('%s: seo.description sin «$» ni precio', (_s, p) => {
    expect(p.seo.description).not.toContain('$');
    expect(p.seo.description).not.toMatch(/\d+\.\d{2}/);
  });
});
