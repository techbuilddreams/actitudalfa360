// @vitest-environment jsdom
// Estado del pago en la ficha: mutantes vivos de la ronda 2 (M1, M3, M6), navegación que nunca ocurre y ficha agotada.
// Nacido de las sondas del Rompedor r2 (tests/zz-probe-ui.test.tsx en rompedor-r2-probes).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductView } from '@/components/product-view';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import { copy } from '@/content';

class NoopIO { observe() {} unobserve() {} disconnect() {} }
beforeEach(() => vi.stubGlobal('IntersectionObserver', NoopIO));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

const taza = staticCatalog.bySlug('taza-negra-15oz')!;
const vaso = staticCatalog.bySlug('vaso-termico-20oz')!;
const soldOut = (p: typeof taza) => ({ ...p, variants: [{ ...p.variants[0]!, available: false }] });
const pending = () => vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() => new Promise(() => {}));
const okFetch = () => vi.fn(async () => new Response(JSON.stringify({ url: 'https://checkout.stripe.test/s' }), { status: 200 }));
const kitButton = () => screen.getByRole('button', { name: /el kit$/ }) as HTMLButtonElement;
const buyButton = () => screen.getByRole('button', { name: 'Comprar ahora' }) as HTMLButtonElement;

function stubAssign() {
  const assign = vi.fn();
  const orig = window.location;
  Object.defineProperty(window, 'location', { configurable: true, value: { ...orig, assign } });
  return { assign, restore: () => Object.defineProperty(window, 'location', { configurable: true, value: orig }) };
}
const persistedPageshow = () => {
  const ev = new Event('pageshow') as Event & { persisted: boolean };
  Object.defineProperty(ev, 'persisted', { value: true });
  return ev;
};

describe('M1: tras «Atrás» (pageshow persisted) el botón no solo parece habilitado: compra', () => {
  it('un segundo clic después del pageshow hace un segundo POST', async () => {
    const f = okFetch();
    vi.stubGlobal('fetch', f);
    const { assign, restore } = stubAssign();
    try {
      render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
      fireEvent.click(buyButton());
      await waitFor(() => expect(assign).toHaveBeenCalledOnce());
      await act(async () => { window.dispatchEvent(persistedPageshow()); });
      fireEvent.click(buyButton());
      await waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    } finally { restore(); }
  });
});

describe('M3: el kit de la ficha exige también que ESTA pieza esté disponible', () => {
  it('pieza de la ficha agotada, la otra disponible: no hay kit', () => {
    const { container } = render(<ProductView product={soldOut(taza)} partner={vaso} shippingCents={899} automaticTax={false} />);
    expect(container.querySelector('#kit')).toBeNull();
  });
});

describe('M6: la guarda por ref vale para TODOS los orígenes, no solo «buy»', () => {
  it.each([['comprar y luego kit', false], ['kit y luego comprar', true]])('%s en el mismo tick, sin re-render: un solo POST', async (_n, kitFirst) => {
    const f = pending();
    vi.stubGlobal('fetch', f);
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    const [a, b] = kitFirst ? [kitButton(), buyButton()] : [buyButton(), kitButton()];
    act(() => { a.click(); b.click(); });
    await new Promise((r) => setTimeout(r, 20));
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('La navegación a Stripe nunca ocurre (Esc, dominio bloqueado)', () => {
  async function startAndAssign(visibility: 'visible' | 'hidden') {
    vi.useFakeTimers();
    const f = okFetch();
    vi.stubGlobal('fetch', f);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
    const loc = stubAssign();
    render(<ProductView product={taza} partner={vaso} shippingCents={899} automaticTax={false} />);
    fireEvent.click(buyButton());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(loc.assign).toHaveBeenCalledOnce();
    return { f, loc };
  }

  it('la página sigue visible a los 8 s: se reactiva (estado y ref) y un nuevo clic compra', async () => {
    const { f, loc } = await startAndAssign('visible');
    try {
      await act(async () => { await vi.advanceTimersByTimeAsync(7_900); });
      expect(kitButton().disabled).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(200); });
      expect(buyButton().disabled).toBe(false);
      fireEvent.click(buyButton());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(f).toHaveBeenCalledTimes(2);
    } finally { loc.restore(); }
  });

  it('la página ya se ocultó (navegando a Stripe): sigue ocupada', async () => {
    const { loc } = await startAndAssign('hidden');
    try {
      await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
      expect(kitButton().disabled).toBe(true);
    } finally { loc.restore(); }
  });
});

describe('Ficha de un producto agotado', () => {
  it('«Comprar ahora» y la barra fija quedan deshabilitados con «Agotado» (del copy)', () => {
    const f = pending();
    vi.stubGlobal('fetch', f);
    render(<ProductView product={soldOut(taza)} partner={vaso} shippingCents={899} automaticTax={false} />);
    expect(screen.queryByRole('button', { name: 'Comprar ahora' })).toBeNull();
    const buttons = screen.getAllByRole('button', { name: copy.pdp.soldOut, hidden: true }) as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    for (const b of buttons) { expect(b.disabled).toBe(true); fireEvent.click(b); }
    expect(f).not.toHaveBeenCalled();
  });
});
