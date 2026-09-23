import type { Order } from '@/domain/order';

export interface FulfillmentProvider {
  readonly name: string;
  /** Crea el pedido de producción. Debe quedar EN ESPERA hasta aprobarse (un duplicado raro tras una caída se descarta al aprobar). Devuelve id externo. */
  createDraftOrder(order: Order): Promise<string>;
}
