import type { Order, OrderStatus } from '@/domain/order';

export interface OrderRepository {
  /** Inserta si no existe (idempotente por paymentRef, garantizado por índice único). Devuelve el pedido con su número. */
  createIfAbsent(order: Order): Promise<{ created: boolean; order: Order }>;

  /**
   * Reclamo atómico para producir el pedido (compare-and-set):
   * pasa a `fulfillment_processing` solo si está `fulfillment_pending`, o si un reclamo anterior tiene más de `ttlMs`.
   * La hora la pone el ALMACENAMIENTO (un solo reloj), nunca la instancia: relojes de app desfasados no roban reclamos.
   * Devuelve un token de turno únicamente al proceso que ganó el reclamo; `null` a los demás.
   */
  claimForFulfillment(id: string, ttlMs: number): Promise<string | null>;

  /**
   * Cierra el reclamo. Con el token vigente (sigue en `processing` y nadie lo recuperó por vencido) ⇒ `closed`.
   * Sin el turno:
   * - `failed` ⇒ `stale`: no toca nada (un fallo nunca pisa a otro dueño ni a un `created`).
   * - `created` ⇒ una ref REAL de producción siempre gana a un fallo: se guarda igual (`recorded`, con el estado que
   *   había: `processing` de otro, o `failed` ya avisado ⇒ "recuperado"). Si ya había OTRA ref ⇒ `double`
   *   (dos producciones reales; se conserva la primera). La misma ref repetida ⇒ `stale`.
   */
  completeFulfillment(id: string, token: string, result: FulfillmentResult): Promise<CompleteOutcome>;

  findByPaymentRef(paymentRef: string): Promise<Order | undefined>;

  /** Verifica que el almacenamiento responde (para /api/health). */
  ping(): Promise<void>;
}

export type CompleteOutcome =
  | { kind: 'closed' }
  | { kind: 'stale' }
  | { kind: 'recorded'; previous: OrderStatus }
  | { kind: 'double'; existingRef: string };

export type FulfillmentResult = { status: 'fulfillment_created'; ref: string } | { status: 'fulfillment_failed' };

export type { OrderStatus };
