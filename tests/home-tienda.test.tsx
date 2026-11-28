// @vitest-environment jsdom
// Home y fichas con el envío de la configuración: nunca «$0.00»; y la home no anuncia un kit que la ficha no ofrece.
// Nacido de las sondas del Rompedor r2 (zz-probe-ui y zz-probe-placeholders en rompedor-r2-probes).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

class NoopIO { observe() {} unobserve() {} disconnect() {} }
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function load(envs: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(envs)) vi.stubEnv(k, v);
  vi.stubGlobal('IntersectionObserver', NoopIO);
  const { HomeContent } = await import('@/components/home-content');
  const { RetoContent } = await import('@/components/reto-content');
  const Politicas = (await import('@/app/politicas/page')).default;
  const { ProductView } = await import('@/components/product-view');
  const { staticCatalog } = await import('@/infrastructure/catalog/static-catalog');
  const { copy } = await import('@/content');
  const { publicEnv } = await import('@/config/env');
  return { HomeContent, RetoContent, Politicas, ProductView, staticCatalog, copy, pub: publicEnv() };
}

describe('Kit en la home', () => {
  it.each(['taza-negra-15oz', 'vaso-termico-20oz'])('si %s está agotada, la home no muestra la tarjeta del kit', async (slug) => {
    const { HomeContent, staticCatalog } = await load({});
    const v0 = staticCatalog.bySlug(slug)!.variants[0] as { available: boolean };
    v0.available = false;
    try {
      render(<HomeContent />);
      const kitLink = [...document.querySelectorAll('a[href]')].find((a) => a.getAttribute('href')!.endsWith('#kit'));
      expect(kitLink, `KitCard visible: ${kitLink?.textContent}`).toBeUndefined();
    } finally {
      v0.available = true;
    }
  });
  it('con las dos disponibles, sí se muestra (no vacuo)', async () => {
    const { HomeContent } = await load({});
    render(<HomeContent />);
    expect([...document.querySelectorAll('a[href]')].some((a) => a.getAttribute('href')!.endsWith('#kit'))).toBe(true);
  });
});

describe.each([
  { SHIPPING_FLAT_CENTS: '0', STRIPE_AUTOMATIC_TAX: 'true', free: true },
  { SHIPPING_FLAT_CENTS: '899', STRIPE_AUTOMATIC_TAX: 'false', free: false },
  { SHIPPING_FLAT_CENTS: '10000', STRIPE_AUTOMATIC_TAX: 'false', free: false },
])('envío $SHIPPING_FLAT_CENTS', ({ free, ...envs }) => {
  it('home, reto, políticas y las dos fichas: sin «$0.00», sin {…}, y el envío dicho como corresponde', async () => {
    const { HomeContent, RetoContent, Politicas, ProductView, staticCatalog, copy, pub } = await load(envs);
    const [a, b] = staticCatalog.all();
    const trees = [<HomeContent key="h" />, <RetoContent key="r" />, <Politicas key="p" />,
      <ProductView key="a" product={a!} partner={b} shippingCents={pub.SHIPPING_FLAT_CENTS} automaticTax={pub.STRIPE_AUTOMATIC_TAX} />,
      <ProductView key="b" product={b!} partner={a} shippingCents={pub.SHIPPING_FLAT_CENTS} automaticTax={pub.STRIPE_AUTOMATIC_TAX} />];
    const texts: string[] = [];
    for (const t of trees) {
      const { container, unmount } = render(t);
      texts.push(container.textContent ?? '');
      expect(container.textContent).not.toMatch(/\{[^}]*\}|undefined|NaN/);
      expect(container.innerHTML).not.toMatch(/="[^"]*\{[a-z][a-zA-Z]*\}/);
      unmount();
    }
    const all = texts.join('\n') + JSON.stringify(copy);
    expect(all).not.toContain('$0.00');
    const home = texts[0]!;
    if (free) {
      expect(home).toContain('Envío gratis');
      expect(all).not.toMatch(/envío fijo/i);
    } else {
      const money = envs.SHIPPING_FLAT_CENTS === '899' ? '$8.99' : '$100.00';
      expect(home).toContain(`Envío fijo de ${money}`);
      expect(all).not.toMatch(/envío gratis/i);
    }
  });
});
