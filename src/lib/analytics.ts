/**
 * El único camino del CÓDIGO hacia GA4 (la «medición mejorada» de la consola va apagada: ver el runbook en
 * docs/ideas/medicion-y-descubrimiento.md). Lista cerrada de eventos con nombre estándar; nada de salud ni del reto
 * (más allá del alta), nada de correo. Nunca lanza. El sink (gtag) se inyecta: los tests usan uno falso.
 * `purchase` NO está aquí: sale del servidor (webhook de Stripe), donde vive la verdad del dinero.
 */

export interface AnalyticsItem { item_id: string; item_name: string; priceCents: number; quantity: number }

export type AnalyticsEvent =
  | { name: 'page_view'; location: string; title: string }
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

/**
 * Lo único de la URL que sale hacia Google: origen + ruta + utm_* (de dónde vino la visita).
 * Todo lo demás se quita: `/gracias?pedido=cs_…` lleva el ID de la sesión de Stripe, que abre la página del pedido.
 */
export function safeLocation(href: string): string {
  try {
    const u = new URL(href);
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) if (k.startsWith('utm_')) keep.append(k, v);
    const q = keep.toString();
    return `${u.origin}${u.pathname}${q ? `?${q}` : ''}`;
  } catch {
    return '';
  }
}

export function toGtag(e: AnalyticsEvent): [string, GtagParams] {
  switch (e.name) {
    case 'page_view': return ['page_view', { page_location: safeLocation(e.location), page_title: e.title }];
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

const browserPage = () => (typeof window === 'undefined' ? '' : window.location.pathname);

/**
 * Antes de saber si hay permiso, los eventos esperan en una cola corta: el `view_item` de la ficha
 * se dispara antes de que el layout decida (los efectos de React corren de hijo a padre).
 * Al aceptar solo sale lo de la página en la que se acepta: lo de páginas anteriores no se midió con permiso.
 */
export function createAnalytics({ maxQueue = 20, currentPage = browserPage }: { maxQueue?: number; currentPage?: () => string } = {}): Analytics {
  let state: 'pending' | 'enabled' | 'disabled' = 'pending';
  let sink: Sink | null = null;
  let queue: { page: string; e: AnalyticsEvent }[] = [];
  const send = (e: AnalyticsEvent) => {
    try { sink?.(...toGtag(e)); } catch { /* la medición nunca rompe la página */ }
  };
  return {
    track(e) {
      if (state === 'enabled') send(e);
      else if (state === 'pending' && queue.length < maxQueue) queue.push({ page: currentPage(), e });
    },
    enable(s) {
      sink = s;
      state = 'enabled';
      const page = currentPage();
      const pending = queue.filter((q) => q.page === page);
      queue = [];
      pending.forEach((q) => send(q.e));
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
