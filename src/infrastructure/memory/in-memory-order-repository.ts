import { randomUUID } from 'node:crypto';
import type { CompleteOutcome, FulfillmentResult, OrderRepository } from '@/application/ports/order-repository';
import type { Order } from '@/domain/order';

type Row = Order & { claimedAt: Date | null; claimToken: string | null };

/** Para pruebas y desarrollo local. Mismas garantías que Postgres (JS es de un solo hilo). */
export class InMemoryOrderRepository implements OrderRepository {
  /** `clock` = el reloj del almacenamiento (en Postgres, now() de la base). */
  constructor(private readonly clock: () => Date = () => new Date()) {}

  private readonly rows = new Map<string, Row>(); // key: paymentRef
  private seq = 10000;

  async createIfAbsent(order: Order) {
    const existing = this.rows.get(order.paymentRef);
    if (existing) return { created: false, order: strip(existing) };
    const saved = { ...order, number: ++this.seq };
    this.rows.set(order.paymentRef, { ...saved, claimedAt: null, claimToken: null });
    return { created: true, order: saved };
  }

  async claimForFulfillment(id: string, ttlMs: number) {
    const row = this.byId(id);
    if (!row) return null;
    const now = this.clock();
    const claimable = row.status === 'fulfillment_pending'
      || (row.status === 'fulfillment_processing' && row.claimedAt !== null && row.claimedAt.getTime() < now.getTime() - ttlMs);
    if (!claimable) return null;
    const token = randomUUID();
    this.rows.set(row.paymentRef, { ...row, status: 'fulfillment_processing', claimedAt: now, claimToken: token });
    return token;
  }

  async completeFulfillment(id: string, token: string, result: FulfillmentResult): Promise<CompleteOutcome> {
    const row = this.byId(id);
    if (!row) return { kind: 'stale' };
    if (row.status === 'fulfillment_processing' && row.claimToken === token) {
      this.rows.set(row.paymentRef, { ...row, status: result.status, fulfillmentRef: 'ref' in result ? result.ref : row.fulfillmentRef });
      return { kind: 'closed' };
    }
    if (result.status !== 'fulfillment_created') return { kind: 'stale' };
    if (row.status === 'fulfillment_created') {
      return row.fulfillmentRef && row.fulfillmentRef !== result.ref ? { kind: 'double', existingRef: row.fulfillmentRef } : { kind: 'stale' };
    }
    this.rows.set(row.paymentRef, { ...row, status: 'fulfillment_created', fulfillmentRef: row.fulfillmentRef ?? result.ref });
    return { kind: 'recorded', previous: row.status };
  }

  async findByPaymentRef(paymentRef: string) {
    const r = this.rows.get(paymentRef);
    return r ? strip(r) : undefined;
  }

  async ping() {}

  private byId(id: string) {
    for (const r of this.rows.values()) if (r.id === id) return r;
    return undefined;
  }
}

function strip(row: Row): Order {
  const copy: Partial<Row> = { ...row };
  delete copy.claimedAt;
  delete copy.claimToken;
  return copy as Order;
}
