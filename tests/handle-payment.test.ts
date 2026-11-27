import { describe, expect, it, vi } from 'vitest';
import { makeHandlePayment } from '@/application/use-cases/handle-payment';
import type { FulfillmentProvider } from '@/application/ports/fulfillment';
import { RetryLaterError } from '@/domain/errors';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import { InMemoryOrderRepository } from '@/infrastructure/memory/in-memory-order-repository';
import { amounts, noopLogger, paidCheckout } from './fixtures';

const paid = paidCheckout();

const setup = (fulfillment: FulfillmentProvider | null) => {
  const orders = new InMemoryOrderRepository();
  const notifier = { orderPaid: vi.fn(async () => {}), fulfillmentFailed: vi.fn(async () => {}) };
  let n = 0;
  const handle = makeHandlePayment({
    orders, catalog: staticCatalog, fulfillment, notifier, logger: noopLogger,
    newId: () => `id-${++n}`, now: () => new Date('2026-09-23T00:00:00Z'),
  });
  return { orders, notifier, handle };
};

describe('handlePayment', () => {
  it('registra el pedido una sola vez aunque Stripe reenvíe el evento', async () => {
    const createDraftOrder = vi.fn(async () => 'pf_1');
    const { orders, handle } = setup({ name: 'fake', createDraftOrder });
    expect(await handle(paid)).toBe('created');
    expect(await handle(paid)).toBe('duplicate');
    expect(createDraftOrder).toHaveBeenCalledTimes(1);
    expect((await orders.findByPaymentRef('cs_test_123'))?.status).toBe('fulfillment_created');
  });

  it('congela nombre y precio de venta y asigna número de pedido', async () => {
    const { orders, notifier, handle } = setup(null);
    await handle(paid);
    const o = await orders.findByPaymentRef('cs_test_123');
    expect(o?.number).toBe(10001);
    expect(o?.lines[0]).toMatchObject({ sku: 'AA360-TAZA-15-NEGRA', quantity: 1, unitCents: 2499 });
    expect(o?.lines[0]?.name).toContain('Taza');
    expect(notifier.orderPaid).toHaveBeenCalledWith(expect.objectContaining({ number: 10001 }));
  });

  it('un SKU desconocido NO pierde el pedido pagado', async () => {
    const { orders, handle } = setup(null);
    await handle(paidCheckout({ lines: [{ sku: 'RETIRADO-01', quantity: 1 }] }));
    expect((await orders.findByPaymentRef('cs_test_123'))?.lines[0]).toMatchObject({ name: 'RETIRADO-01', unitCents: 0 });
  });

  it('un desglose que no cuadra no rechaza el pago: guarda el total', async () => {
    const { orders, handle } = setup(null);
    await handle(paidCheckout({ amounts: amounts(9999) }));
    const o = await orders.findByPaymentRef('cs_test_123');
    expect(o?.total.cents).toBe(3398);
    expect(o?.amounts.subtotal.cents).toBe(0);
  });

  it('si Printify falla, el pedido queda guardado y se avisa', async () => {
    const { orders, notifier, handle } = setup({ name: 'fake', createDraftOrder: async () => { throw new Error('HTTP 500'); } });
    await handle(paid);
    expect((await orders.findByPaymentRef('cs_test_123'))?.status).toBe('fulfillment_failed');
    expect(notifier.fulfillmentFailed).toHaveBeenCalledOnce();
    expect(notifier.orderPaid).toHaveBeenCalledOnce();
  });

  it('concurrentes: produce una sola vez; los demás piden reintento (no quedan atascados en silencio)', async () => {
    const createDraftOrder = vi.fn(async () => { await new Promise((r) => setTimeout(r, 10)); return 'pf_1'; });
    const { handle, notifier } = setup({ name: 'fake', createDraftOrder });
    const results = await Promise.allSettled([handle(paid), handle(paid), handle(paid), handle(paid)]);
    expect(notifier.orderPaid).toHaveBeenCalledOnce(); // un solo pedido, un solo correo
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected.every((r) => r.reason instanceof RetryLaterError)).toBe(true);
    expect(createDraftOrder).toHaveBeenCalledTimes(1);
    // El reintento de Stripe, ya terminada la producción, responde 200 "duplicate".
    expect(await handle(paid)).toBe('duplicate');
  });

  it('sin proveedor de producción, queda como pagado para crearlo a mano', async () => {
    const { orders, handle } = setup(null);
    await handle(paid);
    expect((await orders.findByPaymentRef('cs_test_123'))?.status).toBe('paid');
  });

  it('lines vacío (metadata perdida): el pago SE GUARDA con línea centinela, sin producción automática, y se avisa', async () => {
    const createDraftOrder = vi.fn(async () => 'pf_1');
    const orders = new InMemoryOrderRepository();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const notifier = { orderPaid: vi.fn(async () => {}), fulfillmentFailed: vi.fn(async () => {}) };
    const handle = makeHandlePayment({ orders, catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder }, notifier, logger, newId: () => 'id-1', now: () => new Date() });
    expect(await handle(paidCheckout({ lines: [] }))).toBe('created');
    const o = await orders.findByPaymentRef('cs_test_123');
    expect(o?.status).toBe('paid');
    expect(o?.lines).toEqual([expect.objectContaining({ sku: 'DESCONOCIDO', quantity: 1, unitCents: 0 })]);
    expect(createDraftOrder).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('order_lines_missing', expect.objectContaining({ paymentRef: 'cs_test_123' }));
    expect(notifier.orderPaid).toHaveBeenCalledOnce();
  });

  it('el caso de uso no calcula la hora del reclamo: pasa el TTL y la base decide', async () => {
    const orders = new InMemoryOrderRepository();
    const claim = vi.spyOn(orders, 'claimForFulfillment');
    const { handle } = { handle: makeHandlePayment({ orders, catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder: async () => 'pf' }, notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {} }, logger: noopLogger, newId: () => 'id-1', now: () => new Date() }) };
    await handle(paid);
    expect(claim).toHaveBeenCalledWith('id-1', 5 * 60_000);
  });

  it('si el reclamo se perdió antes de cerrar (otro proceso lo tomó), lo registra y no avisa un fallo que no es suyo', async () => {
    const orders = new InMemoryOrderRepository();
    vi.spyOn(orders, 'completeFulfillment').mockResolvedValue(false);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const notifier = { orderPaid: vi.fn(async () => {}), fulfillmentFailed: vi.fn(async () => {}) };
    let n = 0;
    const mk = (createDraftOrder: () => Promise<string>) => makeHandlePayment({ orders, catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder }, notifier, logger, newId: () => `id-${++n}`, now: () => new Date() });
    await mk(async () => 'pf_A')(paid);
    expect(logger.error).toHaveBeenCalledWith('fulfillment_claim_lost', expect.objectContaining({ orderId: 'id-1', ref: 'pf_A' }));
    await mk(async () => { throw new Error('HTTP 500'); })(paidCheckout({ paymentRef: 'cs_test_456' }));
    expect(logger.warn).toHaveBeenCalledWith('fulfillment_claim_lost', expect.objectContaining({ status: 'fulfillment_failed' }));
    expect(notifier.fulfillmentFailed).not.toHaveBeenCalled();
  });
});
