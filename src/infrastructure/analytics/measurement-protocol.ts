import 'server-only';
import { orderLabel, UNKNOWN_SKU, type Order } from '@/domain/order';
import type { PurchaseReporter, PurchaseVisit } from '@/application/ports/purchase-reporter';

/**
 * `purchase` server-side hacia GA4 (Measurement Protocol). Sale del webhook de Stripe, donde vive la verdad del
 * dinero: un bloqueador en el navegador no lo pierde y una recarga de /gracias no lo duplica.
 * Lleva el pedido (número, productos, importes) y el client_id de la cookie _ga. NUNCA correo, nombre ni dirección.
 */
export const MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

type Scalar = string | number;
export interface PurchasePayload {
  client_id: string;
  consent: { ad_user_data: 'DENIED'; ad_personalization: 'DENIED' };
  events: { name: 'purchase'; params: Record<string, Scalar | Record<string, Scalar>[]> }[];
}

const dollars = (cents: number) => cents / 100;

/** Puro: mismo pedido y visita ⇒ mismo payload. Importes en centavos hasta el último paso. */
export function buildPurchasePayload(order: Order, visit: PurchaseVisit): PurchasePayload {
  const a = order.amounts;
  // Sin desglose (todo en 0: Stripe lo reportó distinto) el total es lo único fiable.
  const hasBreakdown = a.subtotal.cents + a.shipping.cents + a.tax.cents + a.discount.cents > 0;
  const valueCents = hasBreakdown ? a.subtotal.cents - a.discount.cents : order.total.cents;
  const items = order.lines
    .filter((l) => l.sku !== UNKNOWN_SKU)
    .map((l) => ({ item_id: l.sku, item_name: l.name, price: dollars(l.unitCents), quantity: l.quantity }));
  return {
    client_id: visit.clientId,
    // No hay anuncios: Google Signals y personalización apagados también para lo que llega por aquí.
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [{
      name: 'purchase',
      params: {
        transaction_id: orderLabel(order),
        currency: 'USD',
        value: dollars(valueCents),
        shipping: dollars(a.shipping.cents),
        tax: dollars(a.tax.cents),
        items,
        ...(visit.sessionId ? { session_id: visit.sessionId } : {}),
        engagement_time_msec: 1,
      },
    }],
  };
}

interface Options {
  measurementId: string;
  apiSecret: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export class MeasurementProtocolReporter implements PurchaseReporter {
  constructor(private readonly opts: Options) {}

  async reportPurchase(order: Order, visit: PurchaseVisit): Promise<void> {
    const { measurementId, apiSecret, fetch: doFetch = fetch, timeoutMs = 3_000 } = this.opts;
    const url = `${MP_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
    let res: Response;
    try {
      res = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildPurchasePayload(order, visit)),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // El mensaje original puede llevar la URL, y la URL lleva el secreto: solo el tipo de error sale de aquí.
      throw new Error(`GA4 MP: ${err instanceof Error ? err.name : 'error de red'}`);
    }
    // GA4 responde 2xx aunque el payload sea inválido (eso se valida con /debug/mp/collect en el humo).
    if (!res.ok) throw new Error(`GA4 MP: HTTP ${res.status}`);
  }
}
