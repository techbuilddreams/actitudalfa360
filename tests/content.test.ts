import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('copy del sitio', () => {
  it('el envío del texto sale de SHIPPING_FLAT_CENTS, no de un $8.99 escrito a mano', async () => {
    vi.stubEnv('SHIPPING_FLAT_CENTS', '1099');
    const { copy } = await import('@/content');
    const all = JSON.stringify(copy);
    expect(all).not.toContain('8.99');
    expect(all).toContain('$10.99');
    expect(all).not.toMatch(/\{[a-z]+\}/);
  });

  it('el catálogo usa el mismo texto rellenado', async () => {
    vi.stubEnv('SHIPPING_FLAT_CENTS', '1099');
    const { staticCatalog } = await import('@/infrastructure/catalog/static-catalog');
    expect(JSON.stringify(staticCatalog.all())).not.toContain('8.99');
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
