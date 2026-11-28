import { describe, expect, it, vi } from 'vitest';
import { makeHandlePayment } from '@/application/use-cases/handle-payment';
import type { FulfillmentProvider } from '@/application/ports/fulfillment';
import type { PurchaseReporter } from '@/application/ports/purchase-reporter';
import { EMPTY_ATTRIBUTION } from '@/domain/attribution';
import { RetryLaterError } from '@/domain/errors';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import { InMemoryOrderRepository } from '@/infrastructure/memory/in-memory-order-repository';
import { amounts, noopLogger, paidCheckout } from './fixtures';

const paid = paidCheckout();

const setup = (fulfillment: FulfillmentProvider | null) => {
  const orders = new InMemoryOrderRepository();
  const notifier = { orderPaid: vi.fn(async () => {}), fulfillmentFailed: vi.fn(async () => {}), fulfillmentAnomaly: async () => {} };
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
    const notifier = { orderPaid: vi.fn(async () => {}), fulfillmentFailed: vi.fn(async () => {}), fulfillmentAnomaly: async () => {} };
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
    const { handle } = { handle: makeHandlePayment({ orders, catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder: async () => 'pf' }, notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {}, fulfillmentAnomaly: async () => {} }, logger: noopLogger, newId: () => 'id-1', now: () => new Date() }) };
    await handle(paid);
    expect(claim).toHaveBeenCalledWith('id-1', 5 * 60_000);
  });

  it('si el reclamo se perdió antes de cerrar (otro proceso lo tomó), lo registra y no avisa un fallo que no es suyo', async () => {
    const orders = new InMemoryOrderRepository();
    const complete = vi.spyOn(orders, 'completeFulfillment').mockResolvedValue({ kind: 'recorded', previous: 'fulfillment_processing' });
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const notifier = { orderPaid: vi.fn(async () => {}), fulfillmentFailed: vi.fn(async () => {}), fulfillmentAnomaly: async () => {} };
    let n = 0;
    const mk = (createDraftOrder: () => Promise<string>) => makeHandlePayment({ orders, catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder }, notifier, logger, newId: () => `id-${++n}`, now: () => new Date() });
    await mk(async () => 'pf_A')(paid);
    expect(logger.error).toHaveBeenCalledWith('fulfillment_claim_lost', expect.objectContaining({ orderId: 'id-1', ref: 'pf_A' }));
    complete.mockResolvedValue({ kind: 'stale' });
    await mk(async () => { throw new Error('HTTP 500'); })(paidCheckout({ paymentRef: 'cs_test_456' }));
    expect(logger.warn).toHaveBeenCalledWith('fulfillment_claim_lost', expect.objectContaining({ status: 'fulfillment_failed' }));
    expect(notifier.fulfillmentFailed).not.toHaveBeenCalled();
  });

  it('una ref real que llega tarde sobre un fallo ya avisado ⇒ se registra "recuperado"', async () => {
    const orders = new InMemoryOrderRepository();
    vi.spyOn(orders, 'completeFulfillment').mockResolvedValue({ kind: 'recorded', previous: 'fulfillment_failed' });
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const fulfillmentAnomaly = vi.fn(async () => {});
    const handle = makeHandlePayment({ orders, catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder: async () => 'pf_A' }, notifier: { orderPaid: async () => {}, fulfillmentFailed: vi.fn(async () => {}), fulfillmentAnomaly }, logger, newId: () => 'id-1', now: () => new Date() });
    await handle(paid);
    expect(logger.error).toHaveBeenCalledWith('fulfillment_recovered', expect.objectContaining({ orderId: 'id-1', ref: 'pf_A' }));
    // Ya se avisó un fallo: la tienda debe saber que NO hay que crearlo a mano.
    expect(fulfillmentAnomaly).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1' }), 'recovered', ['pf_A']);
  });

  it('dos producciones reales ⇒ error de producción doble con las dos refs', async () => {
    const orders = new InMemoryOrderRepository();
    vi.spyOn(orders, 'completeFulfillment').mockResolvedValue({ kind: 'double', existingRef: 'pf_B' });
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const fulfillmentAnomaly = vi.fn(async () => {});
    const handle = makeHandlePayment({ orders, catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder: async () => 'pf_A' }, notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {}, fulfillmentAnomaly }, logger, newId: () => 'id-1', now: () => new Date() });
    await handle(paid);
    expect(logger.error).toHaveBeenCalledWith('fulfillment_double', expect.objectContaining({ orderId: 'id-1', refs: ['pf_B', 'pf_A'] }));
    expect(fulfillmentAnomaly).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1' }), 'double', ['pf_B', 'pf_A']);
  });

  it('repositorio en memoria: un created tardío gana a un failed y un failed nunca pisa created', async () => {
    let t = 0;
    const orders = new InMemoryOrderRepository(() => new Date(t));
    const { order } = await orders.createIfAbsent({ ...(await import('./fixtures')).order(), status: 'fulfillment_pending' });
    const a = await orders.claimForFulfillment(order.id, 1000);
    t = 5000;
    const b = await orders.claimForFulfillment(order.id, 1000);
    expect(await orders.completeFulfillment(order.id, b!, { status: 'fulfillment_failed' })).toEqual({ kind: 'closed' });
    expect(await orders.completeFulfillment(order.id, a!, { status: 'fulfillment_created', ref: 'pfA' })).toEqual({ kind: 'recorded', previous: 'fulfillment_failed' });
    expect(await orders.completeFulfillment(order.id, b!, { status: 'fulfillment_failed' })).toEqual({ kind: 'stale' });
    expect(await orders.findByPaymentRef(order.paymentRef)).toMatchObject({ status: 'fulfillment_created', fulfillmentRef: 'pfA' });
  });
});

describe('handlePayment → purchase server-side (GA4)', () => {
  const visit = { gaClientId: '123.456', gaSessionId: '1700000123', utm: { source: 'tiktok', medium: 'social', campaign: 'reto', term: null, content: null } };
  const mk = (reporter: PurchaseReporter, logger = noopLogger) => {
    const orders = new InMemoryOrderRepository();
    const tasks: (() => Promise<void>)[] = [];
    const handle = makeHandlePayment({
      orders, catalog: staticCatalog, fulfillment: null, logger,
      notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {}, fulfillmentAnomaly: async () => {} },
      newId: () => 'id-1', now: () => new Date('2026-11-28T00:00:00Z'),
      analytics: { reporter, defer: (t) => { tasks.push(t); } },
    });
    const flush = () => Promise.all(tasks.splice(0).map((t) => t()));
    return { orders, handle, flush, tasks };
  };

  it('pedido nuevo con visita medida ⇒ un purchase, DESPUÉS de responder (defer), con el número de pedido', async () => {
    const reportPurchase = vi.fn(async () => {});
    const { handle, flush, tasks } = mk({ reportPurchase });
    await handle(paidCheckout({ attribution: visit }));
    expect(reportPurchase).not.toHaveBeenCalled(); // nada dentro de la respuesta a Stripe
    expect(tasks).toHaveLength(1);
    await flush();
    expect(reportPurchase).toHaveBeenCalledWith(expect.objectContaining({ number: 10001 }), { clientId: '123.456', sessionId: '1700000123' });
  });

  it('el reenvío de Stripe (duplicate) no vuelve a mandar la compra', async () => {
    const reportPurchase = vi.fn(async () => {});
    const { handle, flush } = mk({ reportPurchase });
    await handle(paidCheckout({ attribution: visit }));
    expect(await handle(paidCheckout({ attribution: visit }))).toBe('duplicate');
    await flush();
    expect(reportPurchase).toHaveBeenCalledOnce();
  });

  it('sin client_id (no hubo permiso de medir) ⇒ Google no se entera; el pedido se guarda igual', async () => {
    const reportPurchase = vi.fn(async () => {});
    const { handle, tasks, orders } = mk({ reportPurchase });
    expect(await handle(paidCheckout({ attribution: { ...EMPTY_ATTRIBUTION, utm: null } }))).toBe('created');
    expect(tasks).toHaveLength(0);
    expect(await orders.findByPaymentRef('cs_test_123')).toBeDefined();
  });

  it('si GA4 falla, se registra y el pago sigue siendo created (la medición nunca tumba el webhook)', async () => {
    const error = vi.fn();
    const { handle, flush } = mk({ reportPurchase: async () => { throw new Error('HTTP 500'); } }, { ...noopLogger, error });
    expect(await handle(paidCheckout({ attribution: visit }))).toBe('created');
    await expect(flush()).resolves.toBeDefined();
    expect(error).toHaveBeenCalledWith('analytics_purchase_failed', expect.objectContaining({ orderId: 'id-1' }));
  });

  it('la campaña de origen (UTM) queda en el pedido; los IDs de GA4 no', async () => {
    const { handle, orders } = mk({ reportPurchase: async () => {} });
    await handle(paidCheckout({ attribution: visit }));
    const o = await orders.findByPaymentRef('cs_test_123');
    expect(o?.utm).toEqual(visit.utm);
    expect(JSON.stringify(o)).not.toContain('123.456');
  });

  it('sin UTM ⇒ utm null (visita directa)', async () => {
    const { handle, orders } = mk({ reportPurchase: async () => {} });
    await handle(paidCheckout());
    expect((await orders.findByPaymentRef('cs_test_123'))?.utm).toBeNull();
  });
});

describe('handlePayment → purchase: robustez (Rompedor P2 / QA P2)', () => {
  const visit = { gaClientId: '123.456', gaSessionId: null, utm: null };
  it('si `defer` lanza al programar, el pago sigue: created, producción hecha, y se registra', async () => {
    const error = vi.fn();
    const createDraftOrder = vi.fn(async () => 'pf_1');
    const handle = makeHandlePayment({
      orders: new InMemoryOrderRepository(), catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder },
      notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {}, fulfillmentAnomaly: async () => {} },
      logger: { ...noopLogger, error }, newId: () => 'id-1', now: () => new Date(),
      analytics: { reporter: { reportPurchase: async () => {} }, defer: () => { throw new Error('after fuera de contexto'); } },
    });
    expect(await handle(paidCheckout({ attribution: visit }))).toBe('created');
    expect(createDraftOrder).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith('analytics_purchase_failed', expect.objectContaining({ orderId: 'id-1' }));
  });
  it('la compra se programa ANTES del aviso de pedido: si el aviso lanza, el purchase no se pierde', async () => {
    const tasks: (() => Promise<void>)[] = [];
    const handle = makeHandlePayment({
      orders: new InMemoryOrderRepository(), catalog: staticCatalog, fulfillment: null,
      notifier: { orderPaid: async () => { throw new Error('SMTP'); }, fulfillmentFailed: async () => {}, fulfillmentAnomaly: async () => {} },
      logger: noopLogger, newId: () => 'id-1', now: () => new Date(),
      analytics: { reporter: { reportPurchase: async () => {} }, defer: (t) => { tasks.push(t); } },
    });
    await expect(handle(paidCheckout({ attribution: visit }))).rejects.toThrow('SMTP');
    expect(tasks).toHaveLength(1);
  });
});
