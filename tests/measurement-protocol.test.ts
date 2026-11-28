import { describe, expect, it, vi } from 'vitest';
import { UNKNOWN_SKU } from '@/domain/order';
import { buildPurchasePayload, MP_ENDPOINT, MeasurementProtocolReporter } from '@/infrastructure/analytics/measurement-protocol';
import { amounts, order } from './fixtures';

const visit = { clientId: '123.456', sessionId: '1700000123' };
// 2 tazas × 24.99 = 49.98; envío 8.99; impuesto 3.10 ⇒ total 62.07
const sale = order({ total: { cents: 6207, currency: 'usd' }, amounts: amounts(4998, 899, 310) });

describe('buildPurchasePayload', () => {
  const p = buildPurchasePayload(sale, visit);
  const ev = p.events[0]!;

  it('purchase con transaction_id = número de pedido (GA4 descarta duplicados por él)', () => {
    expect(ev.name).toBe('purchase');
    expect(ev.params.transaction_id).toBe('AA360-10001');
    expect(p.client_id).toBe('123.456');
  });

  it('value = venta sin envío ni impuesto; envío e impuesto aparte; en dólares desde centavos', () =>
    expect(ev.params).toMatchObject({ currency: 'USD', value: 49.98, shipping: 8.99, tax: 3.1 }));

  it('items con el precio CONGELADO del pedido', () =>
    expect(ev.params.items).toEqual([{ item_id: 'AA360-TAZA-15-NEGRA', item_name: 'Taza negra 15 oz', price: 24.99, quantity: 2 }]));

  it('session_id para atribuir a la visita, y engagement para que cuente como usuario activo', () =>
    expect(ev.params).toMatchObject({ session_id: '1700000123', engagement_time_msec: 1 }));

  it('sin session_id: no se inventa uno', () =>
    expect(buildPurchasePayload(sale, { clientId: '1.2', sessionId: null }).events[0]!.params).not.toHaveProperty('session_id'));

  it('anuncios negados explícitamente (no hay anuncios: la política lo promete)', () =>
    expect(p.consent).toEqual({ ad_user_data: 'DENIED', ad_personalization: 'DENIED' }));

  it('NUNCA datos de contacto: ni correo, ni nombre, ni dirección, ni la sesión de Stripe', () => {
    const s = JSON.stringify(p);
    for (const leak of ['cliente@example.com', 'Luis Ramos', '1 Main St', 'Troy', '12182', 'cs_test_', 'o1']) expect(s, leak).not.toContain(leak);
  });

  it('desglose perdido (todo en 0): value = total, sin envío ni impuesto inventados', () => {
    const e = buildPurchasePayload(order({ total: { cents: 3398, currency: 'usd' }, amounts: amounts(0, 0, 0) }), visit).events[0]!;
    expect(e.params).toMatchObject({ value: 33.98, shipping: 0, tax: 0 });
  });

  it('descuento: value = subtotal − descuento', () => {
    const e = buildPurchasePayload(order({ total: { cents: 5397, currency: 'usd' }, amounts: amounts(4998, 899, 0, 500) }), visit).events[0]!;
    expect(e.params.value).toBe(44.98);
  });

  it('la línea centinela de un pago sin líneas no se manda como producto', () => {
    const e = buildPurchasePayload(order({ lines: [{ sku: UNKNOWN_SKU, quantity: 1, name: 'x', unitCents: 0 }] }), visit).events[0]!;
    expect(e.params.items).toEqual([]);
  });
});

describe('MeasurementProtocolReporter', () => {
  const ok = () => vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }));
  const mk = (fetchFn: ReturnType<typeof ok> | typeof fetch) =>
    new MeasurementProtocolReporter({ measurementId: 'G-AB12CD34EF', apiSecret: 'secreto-mp-123', fetch: fetchFn as typeof fetch, timeoutMs: 3000 });

  it('POST JSON al endpoint de GA4 con id y secreto en la query', async () => {
    const f = ok();
    await mk(f).reportPurchase(sale, visit);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe(`${MP_ENDPOINT}?measurement_id=G-AB12CD34EF&api_secret=secreto-mp-123`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(buildPurchasePayload(sale, visit));
    expect(init.signal).toBeInstanceOf(AbortSignal); // con límite de tiempo: nunca cuelga el `after`
  });

  it('respuesta no 2xx ⇒ lanza, SIN el secreto en el mensaje', async () => {
    const err = await mk(async () => new Response('x', { status: 500 })).reportPurchase(sale, visit).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('500');
    expect((err as Error).message).not.toContain('secreto-mp-123');
  });

  it('error de red ⇒ lanza sin el secreto (ni la URL)', async () => {
    const err = await mk(async () => { throw new TypeError('fetch failed https://x?api_secret=secreto-mp-123'); }).reportPurchase(sale, visit).catch((e: Error) => e);
    expect((err as Error).message).not.toContain('secreto-mp-123');
  });
});
