import { describe, expect, it, vi } from 'vitest';
import { EmailNotifier } from '@/infrastructure/notify/email-notifier';
import { newSaleEmail, orderConfirmationEmail } from '@/infrastructure/email/order-email';
import { usd } from '@/domain/money';
import { amounts, order as makeOrder } from './fixtures';

const order = makeOrder({ shipping: { name: 'Ana <b>Pérez</b>', line1: '1 Main', city: 'Troy', state: 'NY', postalCode: '12182', country: 'US' } });
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe('correo de confirmación', () => {
  it('incluye número de pedido, producto, desglose, total y escapa HTML del cliente', () => {
    const m = orderConfirmationEmail(order)!;
    expect(m.to).toBe('cliente@example.com');
    expect(m.subject).toContain('AA-10001');
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
    expect(newSaleEmail(order, 'yo@example.com').subject).toContain('AA-10001');
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
});
