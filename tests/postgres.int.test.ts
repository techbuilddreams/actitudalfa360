import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { closeDb, getDb } from '@/infrastructure/db/client';
import { PostgresOrderRepository } from '@/infrastructure/db/postgres-order-repository';
import { checkSchema } from '@/infrastructure/db/schema-status';
import { makeHandlePayment } from '@/application/use-cases/handle-payment';
import type { PaidCheckout } from '@/application/ports/payment-gateway';
import { staticCatalog } from '@/infrastructure/catalog/static-catalog';
import { usd } from '@/domain/money';
import { RetryLaterError } from '@/domain/errors';
import type { Order } from '@/domain/order';
import { amounts } from './fixtures';
import { runMigrate, type RunResult } from './support/run-migrate';

const url = process.env.TEST_DATABASE_URL;
const noop = { info: () => {}, warn: () => {}, error: () => {} };
const journal = JSON.parse(readFileSync(path.resolve(__dirname, '../drizzle/meta/_journal.json'), 'utf8')) as { entries: unknown[] };
const TTL = 5 * 60_000;

const newOrder = (over: Partial<Order> = {}): Order => ({
  id: randomUUID(), paymentRef: `cs_test_${randomUUID()}`, number: null, status: 'fulfillment_pending',
  lines: [{ sku: 'X', quantity: 1, name: 'X', unitCents: 2499 }], total: usd(3398), amounts: amounts(2499),
  email: 'a@b.com', phone: null, shipping: null, fulfillmentRef: null, createdAt: new Date(), ...over,
});
const paidOf = (over: Partial<PaidCheckout> = {}): PaidCheckout => ({
  paymentRef: `cs_test_${randomUUID()}`, lines: [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 1 }], total: usd(3398), amounts: amounts(2499),
  email: null, phone: null, shipping: { name: 'A B', line1: '1', city: 'Troy', state: 'NY', postalCode: '12182', country: 'US' }, ...over,
});

// Como Supabase: roles anon/authenticated con privilegios POR DEFECTO sobre todo lo que se cree en public.
// Sin esto el REVOKE de la migración no se probaría (no habría nada que quitar).
const SUPABASE_LIKE_ROLES = `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;`;

describe.skipIf(!url)('Postgres (integración, concurrencia real)', () => {
  // Este archivo BORRA el esquema: solo contra una base cuyo nombre diga "test".
  const admin = url ? postgres(url, { max: 2, prepare: false, onnotice: () => {} }) : (undefined as never);
  const repo = () => new PostgresOrderRepository(getDb(url!, 10));
  /** Simula que el reclamo vigente se hizo hace `min` minutos según el reloj de la BASE. */
  const ageClaim = (id: string, min: number) => admin`UPDATE orders SET claimed_at = now() - make_interval(mins => ${min}::int) WHERE id = ${id}`;
  let concurrent: RunResult[] = [];

  beforeAll(async () => {
    if (!/\/[^/?]*test[^/?]*(\?|$)/.test(url!)) throw new Error('TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga "test"');
    await admin.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await admin.unsafe(SUPABASE_LIKE_ROLES);
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

  it('el esquema de la base cuadra con el journal del código (lo que reporta /api/health)', async () => {
    expect(await checkSchema(getDb(url!, 10))).toBe('ok');
  });

  it('20 webhooks simultáneos del mismo pago ⇒ 1 pedido y 1 producción', async () => {
    const createDraftOrder = vi.fn(async () => { await new Promise((r) => setTimeout(r, 30)); return 'pf_1'; });
    const handle = makeHandlePayment({
      orders: repo(), catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder },
      notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {} }, logger: noop,
      newId: randomUUID, now: () => new Date(),
    });
    const paid = paidOf();
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

  describe('reclamo de producción (reloj de la base + token de turno)', () => {
    it('un reclamo vencido (proceso caído) se recupera con token nuevo; uno vigente no', async () => {
      const r = repo();
      const { order } = await r.createIfAbsent(newOrder());
      const a = await r.claimForFulfillment(order.id, TTL);
      expect(typeof a).toBe('string');
      expect(await r.claimForFulfillment(order.id, TTL)).toBeNull(); // vigente
      await ageClaim(order.id, 6);
      const b = await r.claimForFulfillment(order.id, TTL); // vencido ⇒ recuperable
      expect(typeof b).toBe('string');
      expect(b).not.toBe(a);
      expect(await r.completeFulfillment(order.id, b!, { status: 'fulfillment_created', ref: 'pf_9' })).toBe(true);
      expect(await r.claimForFulfillment(order.id, TTL)).toBeNull(); // terminado: no se vuelve a reclamar
      expect((await r.findByPaymentRef(order.paymentRef))?.fulfillmentRef).toBe('pf_9');
    });

    it('dos instancias con relojes de app distintos (6 min) ⇒ 1 sola producción', async () => {
      const createDraftOrder = vi.fn(async () => { await new Promise((res) => setTimeout(res, 200)); return `pf_${randomUUID().slice(0, 8)}`; });
      const mk = (skewMs: number) => makeHandlePayment({
        orders: repo(), catalog: staticCatalog, fulfillment: { name: 'fake', createDraftOrder },
        notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {} }, logger: noop,
        newId: randomUUID, now: () => new Date(Date.now() + skewMs),
      });
      const paid = paidOf();
      const a = mk(0)(paid);
      await new Promise((res) => setTimeout(res, 50)); // A ya reclamó y está "en Printify"
      const b = mk(6 * 60_000)(paid);                 // B: misma hora real, reloj de app +6 min
      await Promise.allSettled([a, b]);
      expect(createDraftOrder).toHaveBeenCalledTimes(1);
    });

    it('A reclama, vence, B reclama; A termina tarde con failed y B con created ⇒ queda lo de B', async () => {
      const r = repo();
      const { order } = await r.createIfAbsent(newOrder());
      const a = await r.claimForFulfillment(order.id, TTL);
      await ageClaim(order.id, 6);
      const b = await r.claimForFulfillment(order.id, TTL);
      expect(await r.completeFulfillment(order.id, a!, { status: 'fulfillment_failed' })).toBe(false); // A tardío: rechazado
      expect(await r.completeFulfillment(order.id, b!, { status: 'fulfillment_created', ref: 'pf_B' })).toBe(true);
      expect(await r.findByPaymentRef(order.paymentRef)).toMatchObject({ status: 'fulfillment_created', fulfillmentRef: 'pf_B' });
    });

    it('completeFulfillment no pisa un pedido ya cerrado, ni con el token correcto (guardia de estado)', async () => {
      const r = repo();
      const { order } = await r.createIfAbsent(newOrder());
      const t = await r.claimForFulfillment(order.id, TTL);
      expect(await r.completeFulfillment(order.id, t!, { status: 'fulfillment_created', ref: 'pf_1' })).toBe(true);
      expect(await r.completeFulfillment(order.id, t!, { status: 'fulfillment_failed' })).toBe(false);
      expect(await r.completeFulfillment(order.id, randomUUID(), { status: 'fulfillment_failed' })).toBe(false);
      expect(await r.findByPaymentRef(order.paymentRef)).toMatchObject({ status: 'fulfillment_created', fulfillmentRef: 'pf_1' });
    });

    it('processing sin claimed_at es imposible (si no, quedaría atascado para siempre)', async () => {
      const { order } = await repo().createIfAbsent(newOrder());
      await expect(admin`UPDATE orders SET status = 'fulfillment_processing', claimed_at = NULL WHERE id = ${order.id}`).rejects.toThrow(/orders_processing_claim_ck/);
    });
  });

  it('updated_at cambia solo en cada UPDATE (trigger)', async () => {
    const r = repo();
    const { order } = await r.createIfAbsent(newOrder());
    const [before] = await admin`SELECT updated_at FROM orders WHERE id = ${order.id}`;
    await new Promise((res) => setTimeout(res, 20));
    expect(await r.claimForFulfillment(order.id, TTL)).not.toBeNull();
    const [after] = await admin`SELECT updated_at FROM orders WHERE id = ${order.id}`;
    expect((after.updated_at as Date).getTime()).toBeGreaterThan((before.updated_at as Date).getTime());
    // Ni siquiera un UPDATE que intente fijarlo a mano lo atrasa.
    await admin`UPDATE orders SET updated_at = '2000-01-01' WHERE id = ${order.id}`;
    const [forced] = await admin`SELECT updated_at FROM orders WHERE id = ${order.id}`;
    expect((forced.updated_at as Date).getTime()).toBeGreaterThanOrEqual((after.updated_at as Date).getTime());
  });

  it('nunca pierde un pago cobrado: correo de 400 caracteres y lines vacío se guardan (y se avisa)', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const handle = makeHandlePayment({
      orders: repo(), catalog: staticCatalog, fulfillment: null,
      notifier: { orderPaid: async () => {}, fulfillmentFailed: async () => {} }, logger, newId: randomUUID, now: () => new Date(),
    });
    const long = paidOf({ email: `${'a'.repeat(388)}@example.com` });
    expect(long.email).toHaveLength(400);
    expect(await handle(long)).toBe('created');
    expect((await repo().findByPaymentRef(long.paymentRef))?.email).toBe(long.email);

    const empty = paidOf({ lines: [] });
    expect(await handle(empty)).toBe('created');
    expect((await repo().findByPaymentRef(empty.paymentRef))?.lines[0]?.sku).toBe('DESCONOCIDO');
    expect(logger.error).toHaveBeenCalledWith('order_lines_missing', expect.objectContaining({ paymentRef: empty.paymentRef }));
  });

  it('una fila con lines corruptas ([null]) se puede leer: se filtran y se registra', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const ref = `x_${randomUUID()}`;
    await admin`INSERT INTO orders ${admin({ id: randomUUID(), payment_ref: ref, status: 'paid', currency: 'usd', created_at: new Date(), total_cents: 3398, subtotal_cents: 2499, shipping_cents: 899, lines: admin.json([null, { sku: 'A', quantity: 1 }]) })}`;
    const o = await new PostgresOrderRepository(getDb(url!, 10), logger).findByPaymentRef(ref);
    expect(o?.lines.map((l) => l.sku)).toEqual(['A']);
    expect(logger.error).toHaveBeenCalledWith('order_lines_invalid', expect.objectContaining({ dropped: 1 }));
  });

  describe('la base rechaza datos inválidos aunque el código fallara', () => {
    // Fila válida de control: si ESTA fallara, los "rechaza" de abajo no probarían nada.
    // (Atrapó una trampa real: un string a jsonb vía postgres.js se guarda como escalar string, no como lista.)
    const valid = () => ({
      id: randomUUID(), payment_ref: `x_${randomUUID()}`, status: 'paid', lines: admin.json([{ sku: 'A', quantity: 1 }]),
      total_cents: 3398, subtotal_cents: 2499, discount_cents: 0, shipping_cents: 899, tax_cents: 0, currency: 'usd', created_at: new Date(),
    });
    const insert = (over: Record<string, unknown> = {}) => admin`INSERT INTO orders ${admin({ ...valid(), ...over })}`;
    // Fila que CUADRA con la columna negativa: así el único CHECK violado es el de esa columna.
    const balanced = (col: string) => {
      if (col === 'total_cents') return { total_cents: -5, subtotal_cents: 0, discount_cents: 0, shipping_cents: 0, tax_cents: 0 };
      const a: Record<string, number> = { subtotal_cents: 2499, discount_cents: 0, shipping_cents: 899, tax_cents: 0, [col]: -5 };
      return { ...a, total_cents: a.subtotal_cents + a.shipping_cents + a.tax_cents - a.discount_cents };
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
      await expect(insert(balanced(col))).rejects.toThrow(new RegExp(`orders_${col}_ck`));
    });
    it('moneda distinta de usd', async () => { await expect(insert({ currency: 'eur' })).rejects.toThrow(/orders_currency_ck/); });
    it('montos que no cuadran', async () => { await expect(insert({ total_cents: 3397 })).rejects.toThrow(/orders_amounts_ck/); });
    it('subtotal 0 con envío/impuesto/descuento sueltos (hueco del cuadre); todo en 0 sí vale', async () => {
      await expect(insert({ total_cents: 1, subtotal_cents: 0, discount_cents: 50000, shipping_cents: 899, tax_cents: 777 })).rejects.toThrow(/orders_amounts_ck/);
      await expect(insert({ total_cents: 3398, subtotal_cents: 0, discount_cents: 0, shipping_cents: 0, tax_cents: 0 })).resolves.toBeDefined();
    });
    it('payment_ref duplicado', async () => {
      const ref = `dup_${randomUUID()}`;
      await insert({ payment_ref: ref });
      await expect(insert({ payment_ref: ref })).rejects.toThrow(/orders_payment_ref_uq/);
    });
    it('order_number no se puede fijar a mano (GENERATED ALWAYS)', async () => {
      await expect(insert({ order_number: 1 })).rejects.toThrow();
    });
  });

  it('RLS activado sin políticas y anon/authenticated sin ningún privilegio sobre orders', async () => {
    const [t] = await admin`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.orders'::regclass`;
    expect(t.relrowsecurity).toBe(true);
    const [{ n }] = await admin`SELECT count(*)::int AS n FROM pg_policies WHERE tablename = 'orders'`;
    expect(n).toBe(0);
    for (const role of ['anon', 'authenticated']) {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        const [{ has }] = await admin`SELECT has_table_privilege(${role}, 'public.orders', ${priv}) AS has`;
        expect(has, `${role} ${priv}`).toBe(false);
      }
      const [{ seq }] = await admin`SELECT has_sequence_privilege(${role}, 'public.orders_order_number_seq', 'USAGE') AS seq`;
      expect(seq, `${role} USAGE seq`).toBe(false);
    }
  });

  it('TODA tabla de public tiene RLS y ningún grant a anon/authenticated (las futuras también)', async () => {
    const tables = await admin`SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p')`;
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) expect(t.relrowsecurity, `RLS en ${t.relname}`).toBe(true);
    const grants = await admin`SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')`;
    expect(grants).toEqual([]);
  });
});
