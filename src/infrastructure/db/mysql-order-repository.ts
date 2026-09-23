import 'server-only';
import { and, eq, lt, or, sql } from 'drizzle-orm';
import { usd } from '@/domain/money';
import type { Order, OrderItem, OrderStatus } from '@/domain/order';
import type { OrderRepository } from '@/application/ports/order-repository';
import type { Db } from './client';
import { orders } from './schema';

type Row = typeof orders.$inferSelect;

/** Filas anteriores al snapshot solo tenían {sku, quantity}: se completan sin inventar precios. */
const toItem = (l: Partial<OrderItem> & { sku: string; quantity: number }): OrderItem => ({
  sku: l.sku, quantity: l.quantity, name: l.name ?? l.sku, unitCents: l.unitCents ?? 0,
});

const toDomain = (r: Row): Order => ({
  id: r.id,
  number: r.orderNumber,
  paymentRef: r.paymentRef,
  status: r.status as OrderStatus,
  lines: r.lines.map(toItem),
  total: usd(r.totalCents),
  amounts: { subtotal: usd(r.subtotalCents), discount: usd(r.discountCents), shipping: usd(r.shippingCents), tax: usd(r.taxCents) },
  email: r.email,
  phone: r.phone,
  shipping: r.shipping ?? null,
  fulfillmentRef: r.fulfillmentRef,
  createdAt: r.createdAt,
});

function isDuplicateKey(e: unknown, depth = 0): boolean {
  if (typeof e !== 'object' || e === null || depth > 3) return false;
  if ((e as { code?: string }).code === 'ER_DUP_ENTRY') return true;
  return isDuplicateKey((e as { cause?: unknown }).cause, depth + 1);
}

export class MySqlOrderRepository implements OrderRepository {
  constructor(private readonly db: Db) {}

  async createIfAbsent(order: Order) {
    // Camino rápido para reintentos de Stripe (el caso común): no intenta INSERT,
    // así no consume números de pedido. La carrera real la sigue resolviendo el índice único.
    const already = await this.findByPaymentRef(order.paymentRef);
    if (already) return { created: false, order: already };
    try {
      const [res] = await this.db.insert(orders).values({
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
      });
      // insertId = valor AUTO_INCREMENT generado en ESTA conexión (order_number): sin carreras ni consulta extra.
      return { created: true, order: { ...order, number: Number(res.insertId) } };
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
      const existing = await this.findByPaymentRef(order.paymentRef);
      if (!existing) throw e;
      return { created: false, order: existing };
    }
  }

  /** UPDATE condicional (compare-and-set): gana solo quien cambia 1 fila. */
  async claimForFulfillment(id: string, now: Date, staleBefore: Date) {
    const [res] = await this.db
      .update(orders)
      .set({ status: 'fulfillment_processing', claimedAt: now })
      .where(
        and(
          eq(orders.id, id),
          or(
            eq(orders.status, 'fulfillment_pending'),
            and(eq(orders.status, 'fulfillment_processing'), lt(orders.claimedAt, staleBefore)),
          ),
        ),
      );
    return res.affectedRows === 1;
  }

  async completeFulfillment(id: string, result: { status: 'fulfillment_created'; ref: string } | { status: 'fulfillment_failed' }) {
    await this.db
      .update(orders)
      .set({ status: result.status, ...(result.status === 'fulfillment_created' ? { fulfillmentRef: result.ref } : {}) })
      .where(and(eq(orders.id, id), eq(orders.status, 'fulfillment_processing')));
  }

  async ping() {
    await this.db.execute(sql`SELECT 1`);
  }

  async findByPaymentRef(paymentRef: string) {
    const rows = await this.db.select().from(orders).where(eq(orders.paymentRef, paymentRef)).limit(1);
    return rows[0] ? toDomain(rows[0]) : undefined;
  }
}
