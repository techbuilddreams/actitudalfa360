// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProductView } from '@/components/product-view';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';

class NoopIO { observe() {} unobserve() {} disconnect() {} }
beforeEach(() => vi.stubGlobal('IntersectionObserver', NoopIO));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const taza = staticCatalog.bySlug('taza-negra-15oz')!;
const vaso = staticCatalog.bySlug('vaso-termico-20oz')!;

describe('ProductView (ficha)', () => {
  it('con STRIPE_AUTOMATIC_TAX avisa del impuesto junto al envío', () => {
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax />);
    expect(screen.getByText(/Envío fijo \$8\.99 · más impuesto según tu estado/)).toBeTruthy();
  });

  it('sin impuesto automático no promete ni menciona impuesto', () => {
    const { container } = render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    expect(container.querySelector('.arrive')!.textContent).not.toMatch(/impuesto/);
  });

  it('precio junto al nombre, en el H1 nombre + frase', () => {
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Taza negra 15 oz');
    expect(h1.parentElement!.textContent).toContain('$24.99');
  });

  it('el kit suma los precios del catálogo y ofrece ahorrar el envío del env, sin montos a mano', () => {
    const { container } = render(<ProductView product={taza} partner={vaso} shippingCents={1099} automaticTax={false} />);
    expect(container.querySelector('#kit')!.textContent).toContain('Kit $59.98 · un solo envío, ahorras $10.99');
    expect(screen.getByRole('button', { name: 'Comprar el kit' })).toBeTruthy();
  });

  it('enlaza a las reglas de su pilar (no hay páginas de pilar todavía)', () => {
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    expect(screen.getByRole('link', { name: 'Dinero' }).getAttribute('href')).toBe('/reto-30-dias#regla-dinero');
  });
});
