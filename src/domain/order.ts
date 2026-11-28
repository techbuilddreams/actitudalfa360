import type { Utm } from './attribution';
import type { Money } from './money';

/**
 * Máquina de estados del pedido. Las transiciones se hacen con compare-and-set en la base de datos,
 * así dos procesos concurrentes nunca producen el mismo pedido dos veces.
 *
 *   paid                      (sin producción automática)
 *   fulfillment_pending ──claim──▶ fulfillment_processing ──▶ fulfillment_created
 *                                        │ (reclamo vencido ⇒ se puede reintentar)
 *                                        └──────────────▶ fulfillment_failed
 */
export type OrderStatus =
  | 'paid'
  | 'fulfillment_pending'
  | 'fulfillment_processing'
  | 'fulfillment_created'
  | 'fulfillment_failed';

/** Tiempo tras el cual un reclamo `processing` se considera abandonado (proceso caído). */
export const FULFILLMENT_CLAIM_TTL_MS = 5 * 60_000;

/** SKU de la línea centinela de un pago cobrado cuyas líneas se perdieron (revisión manual). */
export const UNKNOWN_SKU = 'DESCONOCIDO';

/** Lo que el cliente pidió (viaja en la metadata del pago). */
export interface OrderLine { readonly sku: string; readonly quantity: number }

/**
 * Línea tal como se vendió: nombre y precio CONGELADOS al momento del pago.
 * Cambiar precios o retirar un producto nunca altera pedidos pasados (correos, reportes, producción).
 */
export interface OrderItem extends OrderLine {
  readonly name: string;
  readonly unitCents: number;
}

/** Desglose cobrado por el procesador de pagos (fuente de verdad del dinero). */
export interface OrderAmounts {
  readonly subtotal: Money;
  readonly discount: Money;
  readonly shipping: Money;
  readonly tax: Money;
}

export interface ShippingAddress {
  readonly name: string;
  readonly line1: string;
  readonly line2?: string | null;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}

export interface Order {
  readonly id: string;
  /** Número visible para el cliente (AA360-10001). Lo asigna la base de datos; null hasta guardarse. */
  readonly number: number | null;
  readonly paymentRef: string;             // Stripe Checkout Session id (único)
  readonly status: OrderStatus;
  readonly lines: readonly OrderItem[];
  readonly total: Money;
  readonly amounts: OrderAmounts;
  readonly email: string | null;
  readonly phone: string | null;
  readonly shipping: ShippingAddress | null;
  readonly fulfillmentRef: string | null;
  /** Campaña de la primera visita (UTM), si la medición estaba encendida. Dato propio del negocio. */
  readonly utm: Utm | null;
  readonly createdAt: Date;
}

/** Codifica/decodifica líneas en metadata compacta ("sku:qty,sku:qty"). */
export const encodeLines = (lines: readonly OrderLine[]): string =>
  lines.map((l) => `${l.sku}:${l.quantity}`).join(',');

export const decodeLines = (value: string): OrderLine[] =>
  value
    .split(',')
    .map((part) => part.split(':'))
    .filter(([sku, qty]) => sku && /^\d+$/.test(qty ?? ''))
    .map(([sku, qty]) => ({ sku, quantity: Number(qty) }));

/** Número de pedido legible, único y buscable. Respaldo: final del id de pago (antes de guardarse). */
export const orderLabel = (o: Pick<Order, 'number' | 'paymentRef'>): string =>
  o.number != null ? `AA360-${o.number}` : o.paymentRef.slice(-8).toUpperCase();
