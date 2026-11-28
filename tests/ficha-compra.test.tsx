// @vitest-environment jsdom
// Compra desde la ficha: kit, un solo checkout a la vez, regreso con «Atrás». Nacido de las sondas del Rompedor de compra.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductView } from '@/components/product-view';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';


class NoopIO { observe() {} unobserve() {} disconnect() {} }
beforeEach(() => vi.stubGlobal('IntersectionObserver', NoopIO));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const taza = staticCatalog.bySlug('taza-negra-15oz')!;
const vaso = staticCatalog.bySlug('vaso-termico-20oz')!;
const pending = () => vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() => new Promise(() => {})); // fetch que nunca vuelve (Stripe lento)
const bodies = (f: ReturnType<typeof pending>) => f.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string));
const kitButton = () => screen.getByRole('button', { name: /el kit$/ });

describe('Kit: la pieza de la ficha va primero, en AMBAS fichas', () => {
  it.each([['taza', taza, vaso], ['vaso', vaso, taza]])('ficha %s', async (_n, p, partner) => {
    const f = pending();
    vi.stubGlobal('fetch', f);
    render(<ProductView product={p} partner={partner} shippingCents={899} automaticTax={false} />);
    fireEvent.click(kitButton());
    await waitFor(() => expect(f).toHaveBeenCalledOnce());
    expect(bodies(f)[0].items.map((i: { sku: string }) => i.sku)).toEqual([p.variants[0]!.sku, partner.variants[0]!.sku]);
  });
});

describe('Un solo checkout por ficha', () => {
  it('con «Comprar ahora» en vuelo, el kit queda deshabilitado y no abre un segundo checkout', async () => {
    const f = pending();
    vi.stubGlobal('fetch', f);
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }));
    expect((kitButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(kitButton());
    await new Promise((r) => setTimeout(r, 20));
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('con el kit en vuelo, «Comprar ahora» y la barra quedan deshabilitados', () => {
    vi.stubGlobal('fetch', pending());
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    fireEvent.click(kitButton());
    const buys = screen.getAllByRole('button', { name: /^Comprar( ahora)?$/, hidden: true });
    expect(buys).toHaveLength(2);
    for (const b of buys) expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it('doble clic en el mismo tick: un solo POST (guarda por ref, no por estado)', async () => {
    const f = pending();
    vi.stubGlobal('fetch', f);
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    const buy = screen.getByRole('button', { name: 'Comprar ahora' });
    act(() => { buy.click(); buy.click(); });
    await new Promise((r) => setTimeout(r, 20));
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('Regreso con «Atrás» (bfcache)', () => {
  it('pageshow persisted vuelve a habilitar Comprar y el kit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: 'https://checkout.stripe.test/s' }), { status: 200 })));
    const assign = vi.fn();
    const orig = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...orig, assign } });
    try {
      render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }));
      await waitFor(() => expect(assign).toHaveBeenCalled());
      expect((kitButton() as HTMLButtonElement).disabled).toBe(true);
      const ev = new Event('pageshow') as Event & { persisted: boolean };
      Object.defineProperty(ev, 'persisted', { value: true });
      await act(async () => { window.dispatchEvent(ev); });
      expect((screen.getByRole('button', { name: 'Comprar ahora' }) as HTMLButtonElement).disabled).toBe(false);
      expect((kitButton() as HTMLButtonElement).disabled).toBe(false);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: orig });
    }
  });
});
