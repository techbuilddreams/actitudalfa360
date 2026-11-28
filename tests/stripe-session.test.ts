import { describe, expect, it } from 'vitest';
import { buildCheckoutSessionParams } from '@/infrastructure/stripe/stripe-gateway';
import { priceCart } from '@/domain/cart';
import { usd } from '@/domain/money';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';

const cart = priceCart([{ sku: 'AA360-TAZA-15-NEGRA', quantity: 2 }], (s) => staticCatalog.findVariant(s));
const req = { cart, shipping: usd(899), successUrl: 'https://s.test/ok', cancelUrl: 'https://s.test/productos/taza-negra-15oz' };
const opts = { automaticTax: false, deliveryDays: { min: 5, max: 12 } };

describe('buildCheckoutSessionParams', () => {
  it('no pide teléfono: Printify no lo necesita y cada campo extra cuesta conversión', () => {
    expect(buildCheckoutSessionParams(req, opts).phone_number_collection).toEqual({ enabled: false });
  });

  it('precio y envío salen del servidor, en centavos', () => {
    const p = buildCheckoutSessionParams(req, opts);
    expect(p.line_items?.[0]).toMatchObject({ quantity: 2, price_data: { unit_amount: 2499, currency: 'usd' } });
    expect(p.shipping_options?.[0]?.shipping_rate_data?.fixed_amount).toEqual({ amount: 899, currency: 'usd' });
  });

  it('conserva todo lo que el pedido necesita aguas abajo', () => {
    expect(buildCheckoutSessionParams(req, opts)).toMatchObject({
      mode: 'payment',
      locale: 'es',
      shipping_address_collection: { allowed_countries: ['US'] }, // sin dirección, Printify no puede enviar
      line_items: [{ price_data: { tax_behavior: 'exclusive', product_data: { metadata: { sku: 'AA360-TAZA-15-NEGRA' } } } }],
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', tax_behavior: 'exclusive', delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 12 } } } }],
      metadata: { lines: expect.stringContaining('AA360-TAZA-15-NEGRA') },
      payment_intent_data: { metadata: { lines: expect.stringContaining('AA360-TAZA-15-NEGRA') } },
    });
  });

  it('pasa las URLs y el impuesto automático tal cual', () => {
    const p = buildCheckoutSessionParams(req, { ...opts, automaticTax: true });
    expect(p.cancel_url).toBe(req.cancelUrl);
    expect(p.success_url).toBe(req.successUrl);
    expect(p.automatic_tax).toEqual({ enabled: true });
  });
});
