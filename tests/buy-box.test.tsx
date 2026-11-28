// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BuyBox } from '@/components/buy-box';
import { KitButton } from '@/components/kit-button';
import { CheckoutProvider } from '@/components/use-checkout';
import type { ReactNode } from 'react';
import { MAX_QTY_PER_LINE } from '@/domain/cart';

/** IntersectionObserver de mentira: guarda qué se observa y deja disparar la entrada a mano. */
class FakeIO {
  static last: FakeIO | null = null;
  observed: Element[] = [];
  constructor(public cb: IntersectionObserverCallback) { FakeIO.last = this; }
  observe(el: Element) { this.observed.push(el); }
  unobserve() {}
  disconnect() {}
  fire(isIntersecting: boolean, top: number) {
    act(() => this.cb([{ isIntersecting, boundingClientRect: { top } } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
}

beforeEach(() => { FakeIO.last = null; vi.stubGlobal('IntersectionObserver', FakeIO); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const props = { sku: 'AA360-TAZA-15-NEGRA', label: 'Comprar ahora', barLabel: 'Comprar', name: 'Taza negra 15 oz', price: '$24.99', thumb: '/img/x.webp',
  qtyLabels: { group: 'Cantidad', less: 'Quitar una', more: 'Agregar una', value: 'Cantidad elegida' }, available: true, soldOutLabel: 'Agotado' };
const messages = { busy: 'Abriendo pago seguro…', errorStart: 'No se pudo iniciar el pago.', errorNetwork: 'No se pudo conectar.', errorRetry: 'Intenta de nuevo en un momento.' };
const wrapper = ({ children }: { children: ReactNode }) => <CheckoutProvider messages={messages}>{children}</CheckoutProvider>;
const failing = () => vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'x' }), { status: 400 }));
const qty = () => screen.getByRole('status', { name: 'Cantidad elegida' }).textContent;

describe('BuyBox', () => {
  it('la cantidad va de 1 a MAX_QTY_PER_LINE y no se sale de ahí', () => {
    render(<BuyBox {...props} />, { wrapper });
    const minus = screen.getByRole('button', { name: 'Quitar una' }) as HTMLButtonElement;
    const plus = screen.getByRole('button', { name: 'Agregar una' }) as HTMLButtonElement;
    expect(qty()).toBe('1');
    expect(minus.disabled).toBe(true);
    for (let i = 0; i < MAX_QTY_PER_LINE + 3; i++) fireEvent.click(plus);
    expect(qty()).toBe(String(MAX_QTY_PER_LINE));
    expect(plus.disabled).toBe(true);
    for (let i = 0; i < MAX_QTY_PER_LINE + 3; i++) fireEvent.click(minus);
    expect(qty()).toBe('1');
  });

  it('envía solo sku y cantidad, nunca un precio', async () => {
    const fetchMock = failing();
    vi.stubGlobal('fetch', fetchMock);
    render(<BuyBox {...props} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar una' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar una' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ items: [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 3 }] });
  });

  it('si el pago no arranca, muestra el error y deja reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Sin stock.' }), { status: 400 })));
    render(<BuyBox {...props} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }));
    expect(await screen.findByText(/Sin stock\. Intenta de nuevo/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Comprar ahora' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('Barra de compra fija', () => {
  it('observa un centinela colocado después del botón, no el botón', () => {
    const { container } = render(<BuyBox {...props} />, { wrapper });
    const observed = FakeIO.last!.observed;
    expect(observed).toHaveLength(1);
    expect(observed[0]!.tagName).not.toBe('BUTTON');
    expect(observed[0]!.classList.contains('buy-sentinel')).toBe(true);
    const button = screen.getByRole('button', { name: 'Comprar ahora' });
    expect(button.compareDocumentPosition(observed[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('.buybar')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('aparece solo cuando el centinela ya quedó ARRIBA de la pantalla; con el botón aún abajo, no', () => {
    const { container } = render(<BuyBox {...props} />, { wrapper });
    const bar = container.querySelector('.buybar')!;
    FakeIO.last!.fire(false, 900); // todavía no llegó (abajo)
    expect(bar.classList.contains('show')).toBe(false);
    FakeIO.last!.fire(false, -40); // ya lo pasó (salto por ancla o scroll restaurado incluidos)
    expect(bar.classList.contains('show')).toBe(true);
    expect(bar.getAttribute('aria-hidden')).toBe('false');
    expect((screen.getByRole('button', { name: 'Comprar' }) as HTMLButtonElement).tabIndex).toBe(0);
    FakeIO.last!.fire(true, 200);
    expect(bar.classList.contains('show')).toBe(false);
  });

  it('el botón de la barra compra la misma cantidad elegida', async () => {
    const fetchMock = failing();
    vi.stubGlobal('fetch', fetchMock);
    render(<BuyBox {...props} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar una' }));
    FakeIO.last!.fire(false, -40);
    fireEvent.click(screen.getByRole('button', { name: 'Comprar' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ items: [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 2 }] });
  });
});

describe('KitButton', () => {
  it('manda dos líneas de 1, la pieza de la ficha actual PRIMERO (de eso depende cancelUrl)', async () => {
    const fetchMock = failing();
    vi.stubGlobal('fetch', fetchMock);
    render(<KitButton currentSku="AA360-VASO-20-NEGRO" otherSku="AA360-TAZA-15-NEGRA" label="Agregar el kit" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar el kit' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      items: [{ sku: 'AA360-VASO-20-NEGRO', quantity: 1 }, { sku: 'AA360-TAZA-15-NEGRA', quantity: 1 }],
    });
  });

  it('si el pago no arranca, muestra el error y deja reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<KitButton currentSku="A" otherSku="B" label="Agregar el kit" />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar el kit' }));
    expect(await screen.findByText(/Intenta de nuevo/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Agregar el kit' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
