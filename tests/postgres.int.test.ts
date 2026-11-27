import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { closeDb, getDb } from '@/infrastructure/db/client';
import { PostgresOrderRepository } from '@/infrastructure/db/postgres-order-repository';
import { makeHandlePayment } from '@/application/use-cases/handle-payment';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import { usd } from '@/domain/money';
import { RetryLaterError } from '@/domain/errors';
import type { Order } from '@/domain/order';
import { amounts } from './fixtures';
import { runMigrate, type RunResult } from './support/run-migrate';

const url = process.env.TEST_DATABASE_URL;
const noop = { info: () => {}, warn: () => {}, error: () => {} };
const journal = JSON.parse(readFileSync(path.resolve(__dirname, '../drizzle/meta/_journal.json'), 'utf8')) as { entries: unknown[] };

const newOrder = (over: Partial<Order> = {}): Order => ({
  id: randomUUID(), paymentRef: `cs_test_${randomUUID()}`, number: null, status: 'fulfillment_pending',
  lines: [{ sku: 'X', quantity: 1, name: 'X', unitCents: 2499 }], total: usd(3398), amounts: amounts(2499),
  email: 'a@b.com', phone: null, shipping: null, fulfillmentRef: null, createdAt: new Date(), ...over,
});

describe.skipIf(!url)('Postgres (integración, concurrencia real)', () => {
  // Este archivo BORRA el esquema: solo contra una base cuyo nombre diga "test".
  const admin = url ? postgres(url, { max: 2, prepare: false, onnotice: () => {} }) : (undefined as never);
  const repo = () => new PostgresOrderRepository(getDb(url!, 10));
  let concurrent: RunResult[] = [];

  beforeAll(async () => {
    if (!/\/[^/?]*test[^/?]*(\?|$)/.test(url!)) throw new Error('TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga "test"');
    await admin.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    // Dos builds de Vercel migrando la MISMA base a la vez, sobre una base vacía.
    concurrent = await Promise.all([runMigrate({ DATABASE_MIGRATION_URL: url }), runMigrate({ DATABASE_MIGRATION_URL: url })]);
  }, 60_000);

  afterAll(async () => {
    await closeDb();
    await admin.end();
  });

  it('la migración corrida dos veces a la vez no falla ni duplica (lock de sesión)', async () => {
    for (const r of concurrent) expect(r, r.stderr).toMatchObject({ code: 0 });
    const [{ n }] = await admin`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
    expect(n).toBe(journal.entries.length);
    // Una tercera corrida (redeploy) no hace nada.
    expect((await runMigrate({ DATABASE_MIGRATION_URL: url })).code).toBe(0);
    const [{ n: after }] = await admin`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
    expect(after).toBe(journal.entries.length);
  });

  it('20 webhooks simultáneos del mismo pago ⇒ 1 pedido y 1 producción', async () => {
    const createDraftOrder = vi.fn(async () => { await new Promise((r) => setTimeout(r, 30)); return 'pf_1'; });
    const handle = makeHandlePayment({
      orders: repo(), catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder },
      notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {} }, logger: noop,
      newId: randomUUID, now: () => new Date(),
    });
    const paid = {
      paymentRef: `cs_test_${randomUUID()}`, lines: [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 1 }], total: usd(3398), amounts: amounts(2499),
      email: null, phone: null,
      shipping: { name: 'A B', line1: '1', city: 'Troy', state: 'NY', postalCode: '12182', country: 'US' },
    };
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => handle(paid)));
    expect(results.filter((r) => r.status === 'fulfilled' && r.value === 'created')).toHaveLength(1);
    expect(results.every((r) => r.status === 'fulfilled' || r.reason instanceof RetryLaterError)).toBe(true);
    expect(createDraftOrder).toHaveBeenCalledTimes(1);
    const order = await repo().findByPaymentRef(paid.paymentRef);
    expect(order?.status).toBe('fulfillment_created');
    expect(order?.fulfillmentRef).toBe('pf_1');
    expect(order?.number).toBeGreaterThanOrEqual(10001);
    expect(order?.lines[0]?.unitCents).toBe(2499);
    expect(order?.shipping?.postalCode).toBe('12182');
    const [{ n }] = await admin`SELECT count(*)::int AS n FROM orders WHERE payment_ref = ${paid.paymentRef}`;
    expect(n).toBe(1);
  });

  it('createIfAbsent concurrente con el mismo pago: 1 creado, todos ven el mismo número', async () => {
    const base = newOrder();
    const results = await Promise.all(Array.from({ length: 20 }, () => repo().createIfAbsent({ ...base, id: randomUUID() })));
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(results.map((r) => r.order.number)).size).toBe(1);
    expect(new Set(results.map((r) => r.order.id)).size).toBe(1);
  });

  it('order_number empieza en ≥10001 y es único bajo inserciones concurrentes de pagos distintos', async () => {
    const results = await Promise.all(Array.from({ length: 30 }, () => repo().createIfAbsent(newOrder())));
    const numbers = results.map((r) => r.order.number);
    expect(results.every((r) => r.created)).toBe(true);
    expect(numbers.every((n) => typeof n === 'number' && n >= 10001)).toBe(true);
    expect(new Set(numbers).size).toBe(30);
    // El número devuelto es el que quedó guardado (viene de RETURNING, no de una consulta aparte).
    for (const r of results.slice(0, 5)) expect((await repo().findByPaymentRef(r.order.paymentRef))?.number).toBe(r.order.number);
  });

  it('un reclamo vencido (proceso caído) se puede recuperar; uno vigente no', async () => {
    const r = repo();
    const { order } = await r.createIfAbsent(newOrder({ total: usd(1), amounts: amounts(0, 0), lines: [{ sku: 'X', quantity: 1, name: 'X', unitCents: 1 }] }));
    const t0 = new Date('2026-09-23T10:00:00Z');
    expect(await r.claimForFulfillment(order.id, t0, new Date(t0.getTime() - 300_000))).toBe(true);
    const t1 = new Date(t0.getTime() + 60_000);
    expect(await r.claimForFulfillment(order.id, t1, new Date(t1.getTime() - 300_000))).toBe(false);
    const t2 = new Date(t0.getTime() + 360_000);
    expect(await r.claimForFulfillment(order.id, t2, new Date(t2.getTime() - 300_000))).toBe(true);
    // Un pedido ya terminado no se vuelve a reclamar.
    await r.completeFulfillment(order.id, { status: 'fulfillment_created', ref: 'pf_9' });
    expect(await r.claimForFulfillment(order.id, new Date(), new Date())).toBe(false);
    expect((await r.findByPaymentRef(order.paymentRef))?.fulfillmentRef).toBe('pf_9');
  });

  it('updated_at cambia solo en cada UPDATE (trigger)', async () => {
    const r = repo();
    const { order } = await r.createIfAbsent(newOrder());
    const [before] = await admin`SELECT updated_at FROM orders WHERE id = ${order.id}`;
    await new Promise((res) => setTimeout(res, 20));
    expect(await r.claimForFulfillment(order.id, new Date(), new Date(0))).toBe(true);
    const [after] = await admin`SELECT updated_at FROM orders WHERE id = ${order.id}`;
    expect((after.updated_at as Date).getTime()).toBeGreaterThan((before.updated_at as Date).getTime());
    // Ni siquiera un UPDATE que intente fijarlo a mano lo atrasa.
    await admin`UPDATE orders SET updated_at = '2000-01-01' WHERE id = ${order.id}`;
    const [forced] = await admin`SELECT updated_at FROM orders WHERE id = ${order.id}`;
    expect((forced.updated_at as Date).getTime()).toBeGreaterThanOrEqual((after.updated_at as Date).getTime());
  });

  describe('la base rechaza datos inválidos aunque el código fallara', () => {
    // Fila válida de control: si ESTA fallara, los "rechaza" de abajo no probarían nada.
    // (Atrapó una trampa real: un string a jsonb vía postgres.js se guarda como escalar string, no como lista.)
    const valid = () => ({
      id: randomUUID(), payment_ref: `x_${randomUUID()}`, status: 'paid', lines: admin.json([{ sku: 'A', quantity: 1 }]),
      total_cents: 3398, subtotal_cents: 2499, discount_cents: 0, shipping_cents: 899, tax_cents: 0, currency: 'usd', created_at: new Date(),
    });
    const insert = (over: Record<string, unknown> = {}) => {
      const row = { ...valid(), ...over };
      return admin`INSERT INTO orders ${admin(row)}`;
    };

    it('acepta la fila de control', async () => {
      await expect(insert()).resolves.toBeDefined();
    });
    it('estado inventado', async () => { await expect(insert({ status: 'inventado' })).rejects.toThrow(); });
    it('lines vacío o que no es lista', async () => {
      await expect(insert({ lines: admin.json([]) })).rejects.toThrow(/orders_lines_ck/);
      await expect(insert({ lines: admin.json({ sku: 'A' }) })).rejects.toThrow(/orders_lines_ck/);
    });
    it.each(['total_cents', 'subtotal_cents', 'discount_cents', 'shipping_cents', 'tax_cents'])('%s negativo', async (col) => {
      await expect(insert({ [col]: -5 })).rejects.toThrow();
    });
    it('moneda distinta de usd', async () => { await expect(insert({ currency: 'eur' })).rejects.toThrow(/orders_currency_ck/); });
    it('montos que no cuadran', async () => { await expect(insert({ total_cents: 3397 })).rejects.toThrow(/orders_amounts_ck/); });
    it('payment_ref duplicado', async () => {
      const ref = `dup_${randomUUID()}`;
      await insert({ payment_ref: ref });
      await expect(insert({ payment_ref: ref })).rejects.toThrow(/orders_payment_ref_uq/);
    });
    it('order_number no se puede fijar a mano (GENERATED ALWAYS)', async () => {
      await expect(insert({ order_number: 1 })).rejects.toThrow();
    });
  });

  it('RLS activado sin políticas (default-deny para anon/authenticated)', async () => {
    const [t] = await admin`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.orders'::regclass`;
    expect(t.relrowsecurity).toBe(true);
    const [{ n }] = await admin`SELECT count(*)::int AS n FROM pg_policies WHERE tablename = 'orders'`;
    expect(n).toBe(0);
  });
});
