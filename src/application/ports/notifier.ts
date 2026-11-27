import type { Order } from '@/domain/order';

export type FulfillmentAnomaly = 'recovered' | 'double';

export interface Notifier {
  orderPaid(order: Order): Promise<void>;
  fulfillmentFailed(order: Order, reason: string): Promise<void>;
  /**
   * Anomalía de producción que un humano debe saber (SOLO a la tienda, nunca al cliente):
   * - `recovered`: se había avisado un fallo y luego llegó la ref real ⇒ NO crear el pedido a mano.
   * - `double`: dos producciones reales del mismo pago ⇒ cancelar una en Printify. `refs` = [conservada, sobrante].
   */
  fulfillmentAnomaly(order: Order, kind: FulfillmentAnomaly, refs: readonly string[]): Promise<void>;
}
