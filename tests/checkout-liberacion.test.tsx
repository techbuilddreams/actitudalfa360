// @vitest-environment jsdom
// Temporizador de liberación del pago (ronda 4): mutante M2 vivo y pestaña en segundo plano (sonda ATAQUE 7 del Rompedor r3).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProductView } from '@/components/product-view';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';

class NoopIO { observe() {} unobserve() {} disconnect() {} }
beforeEach(() => vi.stubGlobal('IntersectionObserver', NoopIO));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

const taza = staticCatalog.bySlug('taza-negra-15oz')!;
const vaso = staticCatalog.bySlug('vaso-termico-20oz')!;
const buy = () => screen.getByRole('button', { name: 'Comprar ahora' }) as HTMLButtonElement;
const main = () => document.querySelector('button.btn.block') as HTMLButtonElement;
const state = () => ({ label: main().textContent, disabled: main().disabled });
const ready = { label: 'Comprar ahora', disabled: false };

function setup(vis: { v: DocumentVisibilityState }) {
  vi.useFakeTimers();
  const f = vi.fn(async () => new Response(JSON.stringify({ url: 'https://checkout.stripe.test/s' }), { status: 200 }));
  vi.stubGlobal('fetch', f);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => vis.v);
  const orig = window.location;
  Object.defineProperty(window, 'location', { configurable: true, value: { ...orig, assign: vi.fn() } });
  render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
  return { f, restore: () => Object.defineProperty(window, 'location', { configurable: true, value: orig }) };
}
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const persistedPageshow = () => {
  const ev = new Event('pageshow') as Event & { persisted: boolean };
  Object.defineProperty(ev, 'persisted', { value: true });
  return ev;
};

describe('M2: «Atrás» (pageshow persisted) cancela el temporizador del primer pago', () => {
  it('el temporizador viejo no libera el SEGUNDO pago en curso', async () => {
    const { f, restore } = setup({ v: 'visible' });
    try {
      fireEvent.click(buy());
      await advance(1_000); // primer pago: navegación atascada, temporizador a los 8 s
      await act(async () => { window.dispatchEvent(persistedPageshow()); });
      fireEvent.click(buy());
      await advance(1_000); // segundo pago en curso; su temporizador vence a los ~9 s
      expect(f).toHaveBeenCalledTimes(2);
      await advance(6_500); // t ≈ 8,5 s: ya pasó el temporizador del primero
      expect(state().disabled).toBe(true);
    } finally { restore(); }
  });
});

describe('Pestaña en segundo plano cuando vence el temporizador', () => {
  it('oculta a los 8 s y la navegación falló: sigue ocupado mientras está oculta y se libera al volver', async () => {
    const vis = { v: 'visible' as DocumentVisibilityState };
    const { restore } = setup(vis);
    try {
      fireEvent.click(buy());
      await advance(0);
      vis.v = 'hidden';
      await advance(60_000);
      expect(state().disabled).toBe(true);
      vis.v = 'visible';
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
      expect(state()).toEqual(ready);
    } finally { restore(); }
  });

  it('un visibilitychange a «hidden» no libera', async () => {
    const vis = { v: 'hidden' as DocumentVisibilityState };
    const { restore } = setup(vis);
    try {
      fireEvent.click(buy());
      await advance(9_000);
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
      expect(state().disabled).toBe(true);
    } finally { restore(); }
  });
});
