import { describe, expect, it, vi } from 'vitest';
import { EmailNotifier } from '@/infrastructure/notify/email-notifier';
import { LogNotifier } from '@/infrastructure/notify/log-notifier';
import { CompositeNotifier } from '@/infrastructure/notify/composite-notifier';
import { newSaleEmail, orderConfirmationEmail } from '@/infrastructure/email/order-email';
import { usd } from '@/domain/money';
import { amounts, order as makeOrder } from './fixtures';

const order = makeOrder({ shipping: { name: 'Ana <b>Pérez</b>', line1: '1 Main', city: 'Troy', state: 'NY', postalCode: '12182', country: 'US' } });
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe('correo de confirmación', () => {
  it('incluye número de pedido, producto, desglose, total y escapa HTML del cliente', () => {
    const m = orderConfirmationEmail(order)!;
    expect(m.to).toBe('cliente@example.com');
    expect(m.subject).toContain('AA360-10001');
    expect(m.html).toContain('Taza negra');
    expect(m.html).toContain('$49.98');
    expect(m.html).toContain('$8.99');
    expect(m.html).toContain('$58.97');
    expect(m.html).not.toContain('<b>Pérez</b>');
    expect(m.html).toContain('&lt;b&gt;');
    expect(m.text).toContain('Total pagado: $58.97');
    expect(m.text).not.toContain('Impuestos');
  });

  it('muestra impuestos y descuento solo cuando existen', () => {
    const m = orderConfirmationEmail(makeOrder({ total: usd(5650), amounts: amounts(4998, 899, 253, 500) }))!;
    expect(m.text).toContain('Impuestos: $2.53');
    expect(m.text).toContain('Descuento: −$5.00');
  });

  it('usa el precio congelado aunque el catálogo cambie', () => {
    const m = orderConfirmationEmail(makeOrder({ lines: [{ sku: 'X', quantity: 1, name: 'Pieza retirada', unitCents: 1000 }] }))!;
    expect(m.text).toContain('Pieza retirada x1  $10.00');
  });

  it('sin email del cliente no genera correo', () => {
    expect(orderConfirmationEmail({ ...order, email: null })).toBeNull();
  });

  it('aviso de venta al dueño con número de pedido', () => {
    expect(newSaleEmail(order, 'yo@example.com').subject).toContain('AA360-10001');
  });

  it('si el SMTP falla, no rompe el flujo del pedido', async () => {
    const mailer = { send: vi.fn(async () => { throw new Error('SMTP down'); }) };
    const n = new EmailNotifier(mailer, logger, 'dueño@example.com');
    await expect(n.orderPaid(order)).resolves.toBeUndefined();
    expect(mailer.send).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalled();
  });

  it('líneas perdidas (centinela): el cliente ve "detalle en revisión", nunca el texto interno', () => {
    const lost = makeOrder({ lines: [{ sku: 'DESCONOCIDO', quantity: 1, name: 'Líneas perdidas: revisar el pago en Stripe', unitCents: 0 }] });
    const m = orderConfirmationEmail(lost)!;
    for (const body of [m.html, m.text]) {
      expect(body).not.toContain('DESCONOCIDO');
      expect(body).not.toContain('Stripe');
      expect(body).toContain('Detalle del pedido en revisión');
    }
    expect(newSaleEmail(lost, 'tienda@example.com').text).toContain('Líneas perdidas: revisar el pago en Stripe');
  });

  it('anomalía de producción (recuperado / doble): correo SOLO a la tienda, con las refs; nunca al cliente', async () => {
    const send = vi.fn(async () => {});
    const n = new EmailNotifier({ send }, logger, 'tienda@example.com');
    await n.fulfillmentAnomaly(order, 'double', ['pf_B', 'pf_A']);
    await n.fulfillmentAnomaly(order, 'recovered', ['pf_A']);
    expect(send).toHaveBeenCalledTimes(2);
    const msgs = send.mock.calls.map((c) => (c as unknown as [{ to: string; text: string }])[0]);
    expect(msgs.every((m) => m.to === 'tienda@example.com')).toBe(true);
    expect(msgs[0]?.text).toContain('pf_B');
    expect(msgs[0]?.text).toContain('pf_A');
    expect(msgs[0]?.text).toMatch(/doble/i);
    expect(msgs[1]?.text).toMatch(/NO crear/);
    // Sin correo de tienda configurado: no se envía nada (y jamás al cliente).
    const send2 = vi.fn(async () => {});
    await new EmailNotifier({ send: send2 }, logger).fulfillmentAnomaly(order, 'double', ['pf_B', 'pf_A']);
    expect(send2).not.toHaveBeenCalled();
  });

  it('anomalía: el notifier de log la registra como error y el compuesto la reparte', async () => {
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const other = { orderPaid: vi.fn(async () => {}), fulfillmentFailed: vi.fn(async () => {}), fulfillmentAnomaly: vi.fn(async () => {}) };
    await new CompositeNotifier([new LogNotifier(log), other]).fulfillmentAnomaly(order, 'recovered', ['pf_A']);
    expect(log.error).toHaveBeenCalledWith('fulfillment_anomaly', expect.objectContaining({ orderId: order.id, kind: 'recovered', refs: ['pf_A'] }));
    expect(other.fulfillmentAnomaly).toHaveBeenCalledWith(order, 'recovered', ['pf_A']);
  });
});
