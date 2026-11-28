// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BuyBox } from '@/components/buy-box';
import { MAX_QTY_PER_LINE } from '@/domain/cart';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('BuyBox', () => {
  it('ofrece exactamente las cantidades que el servidor acepta (1..MAX_QTY_PER_LINE)', () => {
    render(<BuyBox sku="AA360-TAZA-15-NEGRA" label="Comprar ahora" />);
    const options = screen.getAllByRole('option').map((o) => Number((o as HTMLOptionElement).value));
    expect(options).toEqual(Array.from({ length: MAX_QTY_PER_LINE }, (_, i) => i + 1));
  });

  it('envía solo sku y cantidad, nunca un precio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'x' }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<BuyBox sku="AA360-TAZA-15-NEGRA" label="Comprar ahora" />);
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ items: [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 3 }] });
  });

  it('si el pago no arranca, muestra el error y deja reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Sin stock.' }), { status: 400 })));
    render(<BuyBox sku="AA360-TAZA-15-NEGRA" label="Comprar ahora" />);
    fireEvent.click(screen.getByRole('button', { name: 'Comprar ahora' }));
    expect(await screen.findByText(/Sin stock\. Intenta de nuevo/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Comprar ahora' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
