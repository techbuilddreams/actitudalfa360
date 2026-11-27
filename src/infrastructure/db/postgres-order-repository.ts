import 'server-only';
import { and, eq, lt, ne, or, sql } from 'drizzle-orm';
import { usd } from '@/domain/money';
import type { Order, OrderItem, OrderStatus } from '@/domain/order';
import type { CompleteOutcome, FulfillmentResult, OrderRepository } from '@/application/ports/order-repository';
import type { Logger } from '@/application/ports/logger';
import type { Db } from './client';
import { orders } from './schema';

type Row = typeof orders.$inferSelect;

/** Filas anteriores al snapshot solo tenían {sku, quantity}: se completan sin inventar precios. */
const toItem = (l: Partial<OrderItem> & { sku: string; quantity: number }): OrderItem => ({
  sku: l.sku, quantity: l.quantity, name: l.name ?? l.sku, unitCents: l.unitCents ?? 0,
});

type RawLine = Partial<OrderItem> & { sku: string; quantity: number };
const isLine = (l: unknown): l is RawLine =>
  typeof l === 'object' && l !== null && typeof (l as RawLine).sku === 'string' && Number.isInteger((l as RawLine).quantity);

/**
 * Nunca lanza por una fila mal formada: un `findByPaymentRef` que lanzara haría que el webhook de ese pago
 * fallara para siempre. Las líneas inválidas se descartan y se registran.
 */
const toDomain = (r: Row, logger?: Logger): Order => {
  const raw: unknown[] = Array.isArray(r.lines) ? r.lines : [];
  const valid = raw.filter(isLine);
  if (valid.length !== raw.length || !Array.isArray(r.lines)) logger?.error('order_lines_invalid', { orderId: r.id, dropped: raw.length - valid.length });
  return mapRow(r, valid.map(toItem));
};

const mapRow = (r: Row, lines: OrderItem[]): Order => ({
  id: r.id,
  number: r.orderNumber,
  paymentRef: r.paymentRef,
  status: r.status as OrderStatus,
  lines,
  total: usd(r.totalCents),
  amounts: { subtotal: usd(r.subtotalCents), discount: usd(r.discountCents), shipping: usd(r.shippingCents), tax: usd(r.taxCents) },
  email: r.email,
  phone: r.phone,
  shipping: r.shipping ?? null,
  fulfillmentRef: r.fulfillmentRef,
  createdAt: r.createdAt,
});

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: Db, private readonly logger?: Logger) {}

  async createIfAbsent(order: Order) {
    // Camino rápido para reintentos de Stripe (el caso común): no intenta INSERT, así no consume números
    // de la secuencia. NO decide nada: la carrera real la resuelve ON CONFLICT sobre el índice único.
    const already = await this.findByPaymentRef(order.paymentRef);
    if (already) return { created: false, order: already };

    // Atómico: si otro webhook ya insertó (o está insertando) este pago, Postgres espera a que confirme y
    // no inserta nada; RETURNING vacío ⇒ no somos los creadores. El número sale de RETURNING de ESTA fila.
    const inserted = await this.db
      .insert(orders)
      .values({
        id: order.id,
        paymentRef: order.paymentRef,
        status: order.status,
        lines: [...order.lines],
        totalCents: order.total.cents,
        subtotalCents: order.amounts.subtotal.cents,
        discountCents: order.amounts.discount.cents,
        shippingCents: order.amounts.shipping.cents,
        taxCents: order.amounts.tax.cents,
        currency: order.total.currency,
        email: order.email,
        phone: order.phone,
        shipping: order.shipping,
        fulfillmentRef: order.fulfillmentRef,
        createdAt: order.createdAt,
      })
      .onConflictDoNothing({ target: orders.paymentRef })
      .returning({ orderNumber: orders.orderNumber });

    if (inserted[0]) return { created: true, order: { ...order, number: inserted[0].orderNumber } };

    // Perdimos la carrera: la fila ganadora ya está confirmada (ON CONFLICT esperó por ella) y la vemos.
    const existing = await this.findByPaymentRef(order.paymentRef);
    if (!existing) throw new Error(`createIfAbsent: conflicto en payment_ref sin fila visible (${order.paymentRef})`);
    return { created: false, order: existing };
  }

  /**
   * UPDATE condicional (compare-and-set): gana solo quien cambia 1 fila.
   * Hora y token los pone la BASE (now(), gen_random_uuid()): un solo reloj para todas las instancias.
   */
  async claimForFulfillment(id: string, ttlMs: number) {
    const won = await this.db
      .update(orders)
      .set({ status: 'fulfillment_processing', claimedAt: sql`now()`, claimToken: sql`gen_random_uuid()` })
      .where(
        and(
          eq(orders.id, id),
          or(
            eq(orders.status, 'fulfillment_pending'),
            and(eq(orders.status, 'fulfillment_processing'), lt(orders.claimedAt, sql`now() - (${Math.trunc(ttlMs)}::integer * interval '1 millisecond')`)),
          ),
        ),
      )
      .returning({ token: orders.claimToken });
    return won[0]?.token ?? null;
  }

  /** Contrato completo en el puerto. Todo en UNA transacción con la fila bloqueada: sin read-modify-write abierto. */
  async completeFulfillment(id: string, token: string, result: FulfillmentResult): Promise<CompleteOutcome> {
    return this.db.transaction(async (tx) => {
      // 1) Dueño del turno vigente: compare-and-set normal.
      const closed = await tx
        .update(orders)
        .set({ status: result.status, ...(result.status === 'fulfillment_created' ? { fulfillmentRef: result.ref } : {}) })
        .where(and(eq(orders.id, id), eq(orders.status, 'fulfillment_processing'), eq(orders.claimToken, token)))
        .returning({ id: orders.id });
      if (closed.length === 1) return { kind: 'closed' } as const;
      // 2) Turno perdido. Un fallo tardío no toca nada.
      if (result.status !== 'fulfillment_created') return { kind: 'stale' } as const;
      // 3) Una ref real tardía: se bloquea la fila (FOR UPDATE) para decidir y escribir sin carrera.
      const [row] = await tx
        .select({ status: orders.status, ref: orders.fulfillmentRef })
        .from(orders)
        .where(eq(orders.id, id))
        .for('update');
      if (!row) return { kind: 'stale' } as const;
      if (row.status === 'fulfillment_created') {
        return row.ref && row.ref !== result.ref ? ({ kind: 'double', existingRef: row.ref } as const) : ({ kind: 'stale' } as const);
      }
      await tx
        .update(orders)
        .set({ status: 'fulfillment_created', fulfillmentRef: sql`COALESCE(${orders.fulfillmentRef}, ${result.ref})` })
        .where(and(eq(orders.id, id), ne(orders.status, 'fulfillment_created')));
      return { kind: 'recorded', previous: row.status as OrderStatus } as const;
    });
  }

  async ping() {
    await this.db.execute(sql`SELECT 1`);
  }

  async findByPaymentRef(paymentRef: string) {
    const rows = await this.db.select().from(orders).where(eq(orders.paymentRef, paymentRef)).limit(1);
    return rows[0] ? toDomain(rows[0], this.logger) : undefined;
  }
}
