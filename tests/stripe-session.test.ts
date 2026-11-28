import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { buildCheckoutSessionParams, StripeGateway } from '@/infrastructure/stripe/stripe-gateway';
import { parseAttribution, utmFromSearch } from '@/domain/attribution';
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

describe('atribución en la sesión de pago', () => {
  const attribution = { gaClientId: '123.456', gaSessionId: '1700000123', utm: { source: 'tiktok', medium: null, campaign: 'reto', term: null, content: null } };

  it('viaja en la metadata de la SESIÓN, sin pisar las líneas', () => {
    const p = buildCheckoutSessionParams({ ...req, attribution }, opts);
    expect(p.metadata).toEqual({ lines: 'AA360-TAZA-15-NEGRA:2', ga_cid: '123.456', ga_sid: '1700000123', utm_source: 'tiktok', utm_campaign: 'reto' });
  });

  it('el ID de GA4 NO se copia al PaymentIntent (una copia menos de un identificador)', () => {
    const p = buildCheckoutSessionParams({ ...req, attribution }, opts);
    expect(p.payment_intent_data?.metadata).toEqual({ lines: 'AA360-TAZA-15-NEGRA:2' });
  });

  it('sin atribución, la metadata es la de siempre', () =>
    expect(buildCheckoutSessionParams(req, opts).metadata).toEqual({ lines: 'AA360-TAZA-15-NEGRA:2' }));
});

describe('parseWebhook lee la atribución (evento firmado de verdad, sin red)', () => {
  const secret = 'whsec_test_atribucion';
  const gateway = new StripeGateway({ secretKey: 'sk_test_x', webhookSecret: secret, automaticTax: false, deliveryDays: { min: 1, max: 2 } });
  const signed = (metadata: Record<string, string>) => {
    const payload = JSON.stringify({
      id: 'evt_1', object: 'event', type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', object: 'checkout.session', payment_status: 'paid', amount_total: 3398, amount_subtotal: 2499, total_details: { amount_shipping: 899, amount_tax: 0, amount_discount: 0 }, metadata, customer_details: { email: 'a@b.com' } } },
    });
    return { payload, header: Stripe.webhooks.generateTestHeaderString({ payload, secret }) };
  };

  it('la devuelve validada', async () => {
    const { payload, header } = signed({ lines: 'AA360-TAZA-15-NEGRA:1', ga_cid: '123.456', ga_sid: '1700000123', utm_source: 'tiktok' });
    const paid = await gateway.parseWebhook(payload, header);
    expect(paid?.attribution).toEqual({ gaClientId: '123.456', gaSessionId: '1700000123', utm: { source: 'tiktok', medium: null, campaign: null, term: null, content: null } });
  });

  it('una sesión vieja (sin claves) ⇒ atribución vacía, el pago sigue', async () => {
    const { payload, header } = signed({ lines: 'AA360-TAZA-15-NEGRA:1' });
    const paid = await gateway.parseWebhook(payload, header);
    expect(paid?.attribution).toEqual({ gaClientId: null, gaSessionId: null, utm: null });
    expect(paid?.total.cents).toBe(3398);
  });
});

describe('Rompedor P1: la atribución nunca impide abrir el pago (codificador REAL de Stripe, red falsa)', () => {
  const fakeFetch = (async () => new Response(JSON.stringify({ id: 'cs_test_x', object: 'checkout.session', url: 'https://checkout.test' }),
    { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } })) as unknown as typeof fetch;
  const stripe = new Stripe('sk_test_fake', { httpClient: Stripe.createFetchHttpClient(fakeFetch), maxNetworkRetries: 0 });
  it('emoji justo en el carácter 100 de una UTM: la sesión se crea', async () => {
    const utm = utmFromSearch(`?utm_source=ig&utm_campaign=${'a'.repeat(99)}${encodeURIComponent('🔥')}`);
    const attribution = parseAttribution({ gaClientId: '123.456', utm });
    await expect(stripe.checkout.sessions.create(buildCheckoutSessionParams({ ...req, attribution }, opts))).resolves.toBeTruthy();
  });
  it('un surrogate suelto que llegue crudo del cliente tampoco', async () => {
    const attribution = parseAttribution({ gaClientId: '123.456', utm: { source: 'ig\uD83D', campaign: '\uDC00x' } });
    await expect(stripe.checkout.sessions.create(buildCheckoutSessionParams({ ...req, attribution }, opts))).resolves.toBeTruthy();
  });
});
