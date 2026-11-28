// @vitest-environment jsdom
// Compra desde la ficha: kit, un solo checkout a la vez, regreso con «Atrás». Nacido de las sondas del Rompedor de compra.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductView } from '@/components/product-view';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import type { Product } from '@/domain/product';

class NoopIO { observe() {} unobserve() {} disconnect() {} }
beforeEach(() => vi.stubGlobal('IntersectionObserver', NoopIO));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const taza = staticCatalog.bySlug('taza-negra-15oz')!;
const vaso = staticCatalog.bySlug('vaso-termico-20oz')!;
const pending = () => vi.fn((..._args: unknown[]) => new Promise<Response>(() => {})); // fetch que nunca vuelve (Stripe lento)
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
