import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Solo los textos (sin las llaves del propio JSON), para buscar marcadores sin rellenar. */
const texts = (v: unknown): string =>
  typeof v === 'string' ? v : Array.isArray(v) ? v.map(texts).join('\n') : v && typeof v === 'object' ? Object.values(v).map(texts).join('\n') : '';

describe('copy del sitio', () => {
  it('el envío del texto sale de SHIPPING_FLAT_CENTS, no de un $8.99 escrito a mano', async () => {
    vi.stubEnv('SHIPPING_FLAT_CENTS', '1099');
    const { copy } = await import('@/content');
    const all = texts(copy);
    expect(all).not.toContain('8.99');
    expect(all).toContain('$10.99');
    expect(all).not.toMatch(/\{[^}]*\}/);
  });

  it('el catálogo usa el mismo texto rellenado', async () => {
    vi.stubEnv('SHIPPING_FLAT_CENTS', '1099');
    const { staticCatalog } = await import('@/infrastructure/catalog/static-catalog');
    const all = texts(staticCatalog.all());
    expect(all).toContain('$10.99');
    expect(all).not.toMatch(/\{[^}]*\}/);
  });
});

describe('aislamiento del copy', () => {
  it('un secreto de pago mal puesto no tumba el texto de la home', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.stubEnv('SHIPPING_FLAT_CENTS', '899');
    const { copy } = await import('@/content');
    expect(JSON.stringify(copy)).toContain('$8.99');
  });

  it('un envío inválido sí falla en voz alta', async () => {
    vi.stubEnv('SHIPPING_FLAT_CENTS', '-5');
    await expect(import('@/content')).rejects.toThrow(/SHIPPING_FLAT_CENTS/);
  });
});

describe('una sola fuente para cada dato de dinero', () => {
  it('copy.json no lleva montos ni plazos de devolución escritos a mano', async () => {
    const raw = JSON.stringify((await import('@/content/copy.json')).default);
    expect(raw).not.toMatch(/\$\d/);
    expect(raw).not.toMatch(/\b30 días\b/);
  });

  it('los precios del copy son los del catálogo', async () => {
    const { copy } = await import('@/content');
    const { staticCatalog } = await import('@/infrastructure/catalog/static-catalog');
    const taza = staticCatalog.findVariant('AA360-TAZA-15-NEGRA')!.variant.price.cents;
    expect(JSON.stringify(copy)).toContain(`$${(taza / 100).toFixed(2)}`);
  });

  it('el envío que se muestra y el que se cobra salen del mismo valor', async () => {
    vi.stubEnv('SHIPPING_FLAT_CENTS', '1099');
    const { checkoutShipping } = await import('@/infrastructure/container');
    const { copy } = await import('@/content');
    expect(checkoutShipping()(undefined as never).cents).toBe(1099);
    expect(JSON.stringify(copy)).toContain('$10.99');
  });

  it('con impuesto automático, las FAQ de precio lo avisan', async () => {
    vi.stubEnv('STRIPE_AUTOMATIC_TAX', 'true');
    const { copy } = await import('@/content');
    expect(copy.products['taza-negra-15oz'].faq.find((f) => f.q.includes('cuesta'))!.a).toMatch(/impuesto/);
  });

  it('sin impuesto automático, no se menciona', async () => {
    vi.stubEnv('STRIPE_AUTOMATIC_TAX', 'false');
    const { copy } = await import('@/content');
    expect(JSON.stringify(copy)).not.toMatch(/impuesto/);
  });
});
