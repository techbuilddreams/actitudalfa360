import { describe, expect, it, vi } from 'vitest';
import { makeCreateCheckout } from '@/application/use-cases/create-checkout';
import { flatShipping } from '@/domain/cart';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import type { CheckoutRequest, PaymentGateway } from '@/application/ports/payment-gateway';

const TAZA = 'AA360-TAZA-15-NEGRA';
const VASO = 'AA360-VASO-20-NEGRO';

function setup() {
  const createCheckout = vi.fn<(req: CheckoutRequest) => Promise<{ url: string }>>(async () => ({ url: 'https://pay.test/s' }));
  const payments = { createCheckout } as unknown as PaymentGateway;
  const run = makeCreateCheckout({ catalog: staticCatalog, payments, shippingFor: flatShipping(899), siteUrl: 'https://site.test' });
  return { run, createCheckout };
}

describe('createCheckout', () => {
  it('si cancela con una pieza, vuelve a su ficha', async () => {
    const { run, createCheckout } = setup();
    await run([{ sku: TAZA, quantity: 1 }]);
    expect(createCheckout.mock.calls[0]![0].cancelUrl).toBe('https://site.test/productos/taza-negra-15oz');
  });

  it('si cancela el kit (varias piezas), vuelve a la ficha desde la que lo agregó, no a la tienda', async () => {
    const { run, createCheckout } = setup();
    await run([{ sku: TAZA, quantity: 1 }, { sku: VASO, quantity: 1 }]);
    expect(createCheckout.mock.calls[0]![0].cancelUrl).toBe('https://site.test/productos/taza-negra-15oz');
  });

  it('kit pedido desde la ficha del vaso (vaso primero): cancela de vuelta al vaso, no a la taza', async () => {
    const { run, createCheckout } = setup();
    await run([{ sku: VASO, quantity: 1 }, { sku: TAZA, quantity: 1 }]);
    expect(createCheckout.mock.calls[0]![0].cancelUrl).toBe('https://site.test/productos/vaso-termico-20oz');
  });

  it('el envío sale de la política del servidor', async () => {
    const { run, createCheckout } = setup();
    await run([{ sku: TAZA, quantity: 2 }]);
    expect(createCheckout.mock.calls[0]![0].shipping.cents).toBe(899);
  });

  it('la atribución del navegador llega a la sesión de pago, validada', async () => {
    const { run, createCheckout } = setup();
    await run([{ sku: TAZA, quantity: 1 }], { gaClientId: '123.456', gaSessionId: 'basura', utm: { source: 'ig' } });
    expect(createCheckout.mock.calls[0]![0].attribution).toEqual({ gaClientId: '123.456', gaSessionId: null, utm: { source: 'ig', medium: null, campaign: null, term: null, content: null } });
  });

  it('sin atribución (medición apagada) ⇒ vacía', async () => {
    const { run, createCheckout } = setup();
    await run([{ sku: TAZA, quantity: 1 }]);
    expect(createCheckout.mock.calls[0]![0].attribution).toEqual({ gaClientId: null, gaSessionId: null, utm: null });
  });
});
