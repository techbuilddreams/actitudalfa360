import { RetryLaterError } from '@/domain/errors';
import { usd } from '@/domain/money';
import { FULFILLMENT_CLAIM_TTL_MS, UNKNOWN_SKU, type Order, type OrderAmounts, type OrderItem, type OrderLine } from '@/domain/order';
import type { CatalogRepository } from '../ports/catalog';
import type { FulfillmentProvider } from '../ports/fulfillment';
import type { Logger } from '../ports/logger';
import type { Notifier } from '../ports/notifier';
import type { OrderRepository } from '../ports/order-repository';
import type { PaidCheckout } from '../ports/payment-gateway';

export interface HandlePaymentDeps {
  orders: OrderRepository;
  catalog: CatalogRepository;
  fulfillment: FulfillmentProvider | null;   // null = crear el pedido de producción a mano
  notifier: Notifier;
  logger: Logger;
  newId: () => string;
  now: () => Date;
}

export type HandlePaymentResult = 'created' | 'duplicate';

/** Línea centinela para un pago cobrado cuyas líneas se perdieron: se guarda y se revisa a mano en Stripe. */
const UNKNOWN_LINE: OrderItem = { sku: UNKNOWN_SKU, quantity: 1, name: 'Líneas perdidas: revisar el pago en Stripe', unitCents: 0 };

/**
 * Caso de uso: registrar un pago confirmado exactamente una vez
 * y (opcionalmente) crear el pedido de producción en espera.
 *
 * Regla de oro: un pago cobrado SIEMPRE queda guardado, aunque falle todo lo demás.
 */
export function makeHandlePayment(deps: HandlePaymentDeps) {
  /** Congela nombre y precio de venta. Un SKU desconocido no bloquea el pedido: se guarda y se avisa. */
  const snapshot = (lines: readonly OrderLine[]): OrderItem[] =>
    lines.map((l) => {
      const found = deps.catalog.findVariant(l.sku);
      if (!found) {
        deps.logger.error('order_unknown_sku', { sku: l.sku });
        return { ...l, name: l.sku, unitCents: 0 };
      }
      const { product, variant } = found;
      const name = product.name.includes(variant.label) ? product.name : `${product.name} — ${variant.label}`;
      return { ...l, name, unitCents: variant.price.cents };
    });

  /**
   * El desglose debe cuadrar con el total (lo exige un CHECK en la base). Si Stripe lo reportara distinto
   * (p. ej. impuestos incluidos), se guarda solo el total: jamás rechazamos un pago cobrado por un desglose.
   */
  const reconcile = (paid: PaidCheckout): OrderAmounts => {
    const a = paid.amounts;
    if (a.subtotal.cents + a.shipping.cents + a.tax.cents === paid.total.cents + a.discount.cents) return a;
    deps.logger.error('order_amounts_mismatch', { paymentRef: paid.paymentRef });
    const zero = usd(0);
    return { subtotal: zero, discount: zero, shipping: zero, tax: zero };
  };

  return async (paid: PaidCheckout): Promise<HandlePaymentResult> => {
    // Sin líneas (metadata perdida y nada que reconstruir): el pago se guarda igual, con una línea centinela,
    // y queda para revisión manual (no se manda a producción algo que no sabemos qué es).
    const linesMissing = paid.lines.length === 0;
    if (linesMissing) deps.logger.error('order_lines_missing', { paymentRef: paid.paymentRef });
    const draft: Order = {
      id: deps.newId(),
      number: null,
      paymentRef: paid.paymentRef,
      status: deps.fulfillment && !linesMissing ? 'fulfillment_pending' : 'paid',
      lines: linesMissing ? [UNKNOWN_LINE] : snapshot(paid.lines),
      total: paid.total,
      amounts: reconcile(paid),
      email: paid.email,
      phone: paid.phone,
      shipping: paid.shipping,
      fulfillmentRef: null,
      createdAt: deps.now(),
    };

    // 1) Registro idempotente (índice único en paymentRef).
    const { created, order } = await deps.orders.createIfAbsent(draft);
    if (created) await deps.notifier.orderPaid(order);
    else deps.logger.info('Pago ya registrado', { paymentRef: paid.paymentRef });

    // 2) Producción: solo el proceso que gana el reclamo atómico la ejecuta.
    if (deps.fulfillment && order.status !== 'paid') {
      // La hora del reclamo la pone la base: aquí solo se dice cuánto dura.
      const token = await deps.orders.claimForFulfillment(order.id, FULFILLMENT_CLAIM_TTL_MS);
      if (token) {
        let ref: string | undefined;
        let reason = '';
        try {
          ref = await deps.fulfillment.createDraftOrder(order);
        } catch (err) {
          reason = err instanceof Error ? err.message : 'desconocido';
          deps.logger.error('No se pudo crear el pedido de producción', { orderId: order.id, reason });
        }
        const out = await deps.orders.completeFulfillment(order.id, token, ref ? { status: 'fulfillment_created', ref } : { status: 'fulfillment_failed' });
        if (out.kind === 'closed') {
          if (!ref) await deps.notifier.fulfillmentFailed(order, reason);
        } else if (out.kind === 'recorded') {
          // Tardamos más que el TTL, pero la ref real de Printify quedó guardada (gana a cualquier fallo).
          if (out.previous === 'fulfillment_failed') {
            // Ya se había avisado un fallo de este pedido: ahora está producido.
            deps.logger.error('fulfillment_recovered', { orderId: order.id, ref });
          } else {
            deps.logger.error('fulfillment_claim_lost', { orderId: order.id, ref, status: 'fulfillment_created' });
          }
        } else if (out.kind === 'double') {
          deps.logger.error('fulfillment_double', { orderId: order.id, refs: [out.existingRef, ref] });
        } else {
          // Nuestro resultado llegó tarde y no cambia nada: el pedido es de otro proceso; no avisamos un fallo ajeno.
          deps.logger.warn('fulfillment_claim_lost', { orderId: order.id, status: ref ? 'fulfillment_created' : 'fulfillment_failed' });
        }
      } else {
        // Perdimos el reclamo. Si el otro proceso sigue "trabajando", pedimos a Stripe que reintente más tarde:
        // si ese proceso murió, el reintento (tras vencer el reclamo) lo recupera. Nunca queda atascado en silencio.
        const current = await deps.orders.findByPaymentRef(paid.paymentRef);
        if (current?.status === 'fulfillment_processing') {
          throw new RetryLaterError('Producción en curso por otro proceso; reintentar');
        }
      }
    }

    return created ? 'created' : 'duplicate';
  };
}
