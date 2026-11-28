/**
 * El ÚNICO camino hacia GA4. Lista cerrada de eventos con nombre estándar; nada de salud ni del reto
 * (más allá del alta), nada de correo. Nunca lanza. El sink (gtag) se inyecta: los tests usan uno falso.
 * `purchase` NO está aquí: sale del servidor (webhook de Stripe), donde vive la verdad del dinero.
 */

export interface AnalyticsItem { item_id: string; item_name: string; priceCents: number; quantity: number }

export type AnalyticsEvent =
  | { name: 'view_item'; item: AnalyticsItem }
  | { name: 'begin_checkout'; items: readonly AnalyticsItem[] }
  | { name: 'sign_up'; method: 'email'; source: 'home' | 'reto' };

type Scalar = string | number;
export type GtagParams = Record<string, Scalar | Record<string, Scalar>[]>;
export type Sink = (name: string, params: GtagParams) => void;

const dollars = (cents: number) => cents / 100;
const gtagItem = (i: AnalyticsItem) => ({ item_id: i.item_id, item_name: i.item_name, price: dollars(i.priceCents), quantity: i.quantity });
const commerce = (items: readonly AnalyticsItem[]): GtagParams => ({
  currency: 'USD',
  // Suma en centavos enteros y divide una vez: 19.99 × 2 + 29.50 = 69.48, no 69.47999.
  value: dollars(items.reduce((s, i) => s + i.priceCents * i.quantity, 0)),
  items: items.map(gtagItem),
});

export function toGtag(e: AnalyticsEvent): [string, GtagParams] {
  switch (e.name) {
    case 'view_item': return ['view_item', commerce([e.item])];
    case 'begin_checkout': return ['begin_checkout', commerce(e.items)];
    case 'sign_up': return ['sign_up', { method: e.method, source: e.source }];
  }
}

export type PriceCatalog = Readonly<Record<string, { name: string; priceCents: number }>>;

/** Líneas del pago (sku + cantidad) con el precio del catálogo. Lo que no está en el catálogo no se mide. */
export function checkoutItems(lines: readonly { sku: string; quantity: number }[], catalog: PriceCatalog): AnalyticsItem[] {
  return lines.flatMap((l) => {
    const p = catalog[l.sku];
    return p ? [{ item_id: l.sku, item_name: p.name, priceCents: p.priceCents, quantity: l.quantity }] : [];
  });
}

export interface Analytics {
  track(e: AnalyticsEvent): void;
  /** Hay permiso: manda lo pendiente y lo que venga. */
  enable(sink: Sink): void;
  /** No hay permiso (o se retiró): tira lo pendiente y no manda nada. */
  disable(): void;
}

/**
 * Antes de saber si hay permiso, los eventos esperan en una cola corta: el `view_item` de la ficha
 * se dispara antes de que el layout decida (los efectos de React corren de hijo a padre).
 */
export function createAnalytics({ maxQueue = 20 }: { maxQueue?: number } = {}): Analytics {
  let state: 'pending' | 'enabled' | 'disabled' = 'pending';
  let sink: Sink | null = null;
  let queue: AnalyticsEvent[] = [];
  const send = (e: AnalyticsEvent) => {
    try { sink?.(...toGtag(e)); } catch { /* la medición nunca rompe la página */ }
  };
  return {
    track(e) {
      if (state === 'enabled') send(e);
      else if (state === 'pending' && queue.length < maxQueue) queue.push(e);
    },
    enable(s) {
      sink = s;
      state = 'enabled';
      const pending = queue;
      queue = [];
      pending.forEach(send);
    },
    disable() {
      state = 'disabled';
      sink = null;
      queue = [];
    },
  };
}

/** La instancia de la página. La enciende o la apaga `ConsentManager`. */
export const analytics = createAnalytics();
