// @vitest-environment jsdom
// Cableado: el núcleo con tests no basta si la página no lo engancha (lección de Tabla Jaladora, 2026-10-26).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductView } from '@/components/product-view';
import { EmailCapture } from '@/components/email-capture';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import { defaultVariant } from '@/domain/product';
import { analytics, type GtagParams } from '@/lib/analytics';
import { copy } from '@/content';

class NoopIO { observe() {} unobserve() {} disconnect() {} }
let sent: [string, GtagParams][];
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', NoopIO);
  sent = [];
  analytics.enable((name, params) => sent.push([name, params]));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); analytics.disable(); });

const taza = staticCatalog.bySlug('taza-negra-15oz')!;
const vaso = staticCatalog.bySlug('vaso-termico-20oz')!;
const names = () => sent.map((s) => s[0]);
const ficha = () => render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);

function stubCheckout() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ url: 'https://checkout.stripe.test/s' }), { status: 200 })));
  const orig = window.location;
  Object.defineProperty(window, 'location', { configurable: true, value: { ...orig, assign: vi.fn() } });
  return () => Object.defineProperty(window, 'location', { configurable: true, value: orig });
}

describe('view_item', () => {
  it('la ficha manda UN view_item con la variante y su precio', () => {
    ficha();
    expect(names()).toEqual(['view_item']);
    const v = defaultVariant(taza);
    expect(sent[0]![1]).toMatchObject({ currency: 'USD', value: v.price.cents / 100, items: [{ item_id: v.sku, quantity: 1 }] });
  });
  it('re-render de la misma ficha no lo repite', () => {
    const { rerender } = ficha();
    rerender(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax />);
    expect(names()).toEqual(['view_item']);
  });
});

describe('begin_checkout', () => {
  it('Comprar ahora: uno, con cantidad y valor del catálogo', async () => {
    const restore = stubCheckout();
    try {
      ficha();
      fireEvent.click(screen.getByRole('button', { name: copy.pdp.qty.more }));
      fireEvent.click(screen.getByRole('button', { name: copy.pdp.buy }));
      await waitFor(() => expect(names()).toContain('begin_checkout'));
      const v = defaultVariant(taza);
      const [, p] = sent.find((s) => s[0] === 'begin_checkout')!;
      expect(p).toMatchObject({ value: (v.price.cents * 2) / 100, items: [{ item_id: v.sku, quantity: 2 }] });
    } finally { restore(); }
  });
  it('el kit: las dos piezas', async () => {
    const restore = stubCheckout();
    try {
      ficha();
      fireEvent.click(screen.getByRole('button', { name: copy.pdp.kitButton }));
      await waitFor(() => expect(names()).toContain('begin_checkout'));
      const items = sent.find((s) => s[0] === 'begin_checkout')![1].items as { item_id: string }[];
      expect(items.map((i) => i.item_id)).toEqual([defaultVariant(taza).sku, defaultVariant(vaso).sku]);
    } finally { restore(); }
  });
  it('doble clic en el mismo instante: un solo begin_checkout (como una sola sesión de pago)', async () => {
    const restore = stubCheckout();
    try {
      ficha();
      const b = screen.getByRole('button', { name: copy.pdp.buy });
      await act(async () => { b.click(); b.click(); });
      expect(names().filter((n) => n === 'begin_checkout')).toHaveLength(1);
    } finally { restore(); }
  });
});

describe('begin_checkout: solo cuando el pago se abre', () => {
  it('409 (sin stock) o error de red: no cuenta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Agotado' }), { status: 409 })));
    ficha();
    fireEvent.click(screen.getByRole('button', { name: copy.pdp.buy }));
    await screen.findByText(/Agotado/);
    expect(names()).not.toContain('begin_checkout');
  });
});

describe('sign_up', () => {
  const t = copy.capture;
  const fill = (email: string) => {
    fireEvent.input(screen.getByLabelText(t.label), { target: { value: email } });
    fireEvent.submit(screen.getByRole('button', { name: t.button }).closest('form')!);
  };
  it('con 202: sign_up con método y origen, y NUNCA el correo', async () => {
    render(<EmailCapture source="reto" text={t} submit={() => Promise.resolve(new Response('{}', { status: 202 }))} />);
    fill('Ana@Correo.com');
    await waitFor(() => expect(names()).toEqual(['sign_up']));
    expect(sent[0]![1]).toEqual({ method: 'email', source: 'reto' });
    expect(JSON.stringify(sent)).not.toMatch(/correo|ana/i);
  });
  it('con error del servidor o de red: nada', async () => {
    const { unmount } = render(<EmailCapture source="home" text={t} submit={() => Promise.resolve(new Response('{}', { status: 500 }))} />);
    fill('ana@correo.com');
    await screen.findByRole('alert');
    unmount();
    render(<EmailCapture source="home" text={t} submit={() => Promise.reject(new TypeError('red'))} />);
    fill('ana@correo.com');
    await screen.findByRole('alert');
    expect(names()).toEqual([]);
  });
});
