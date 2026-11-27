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
   * Cierra el reclamo: solo si sigue en `fulfillment_processing` CON ese token (nadie lo recuperó por vencido).
   * Devuelve false si no cerró nada (el turno ya no era suyo).
   */
  completeFulfillment(id: string, token: string, result: FulfillmentResult): Promise<boolean>;

  findByPaymentRef(paymentRef: string): Promise<Order | undefined>;

  /** Verifica que el almacenamiento responde (para /api/health). */
  ping(): Promise<void>;
}

export type FulfillmentResult = { status: 'fulfillment_created'; ref: string } | { status: 'fulfillment_failed' };

export type { OrderStatus };
