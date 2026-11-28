'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Attribution } from '@/domain/attribution';
import { analytics, checkoutItems, type PriceCatalog } from '@/lib/analytics';
import { currentAttribution } from '@/lib/attribution-client';

export interface CheckoutItem { readonly sku: string; readonly quantity: number }
/** Qué control abrió el pago: solo ese muestra el texto de espera y el error. */
export type CheckoutOrigin = 'buy' | 'kit';

interface CheckoutState {
  busy: boolean;
  /** Texto de espera del botón (copy.json → `checkout.busy`). */
  busyLabel: string;
  origin: CheckoutOrigin | null;
  error: string | null;
  start(items: readonly CheckoutItem[], origin: CheckoutOrigin): Promise<void>;
}

/** Textos del pago (copy.json → `checkout`). El copy es solo de servidor: la ficha los pasa por props. */
export interface CheckoutMessages { busy: string; errorStart: string; errorNetwork: string; errorRetry: string }

const Ctx = createContext<CheckoutState | null>(null);

/** Programa `fn` tras `ms` y devuelve cómo cancelarlo. Inyectable para los tests. */
export type Schedule = (fn: () => void, ms: number) => () => void;
/** Campaña y visita de GA4 para el pago: SOLO con la medición encendida (sin permiso, ni la clave viaja). */
const defaultAttribution = (): Attribution | undefined => (analytics.isEnabled() ? currentAttribution() : undefined);

const defaultSchedule: Schedule = (fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); };
/**
 * Si tras `location.assign` la página sigue VISIBLE pasado este tiempo, la navegación no ocurrió (Esc, extensión que
 * bloquea checkout.stripe.com, red caída): se reactivan los botones. Si la página ya se ocultó, va camino de Stripe.
 */
export const NAVIGATION_STUCK_MS = 8_000;

/**
 * UN estado de pago por ficha: comprar, la barra fija y el kit lo comparten, así que mientras cualquiera
 * está abriendo Stripe todos quedan deshabilitados (nunca dos sesiones de checkout a la vez).
 * El servidor pone el precio: aquí solo viajan sku y cantidad.
 */
export function CheckoutProvider({ children, messages: t, schedule = defaultSchedule, prices = {}, attribution = defaultAttribution }: {
  children: ReactNode; messages: CheckoutMessages; schedule?: Schedule;
  attribution?: () => Attribution | undefined;
  /** Nombre y precio por sku, solo para medir `begin_checkout`. El cobro lo pone el servidor, no esto. */
  prices?: PriceCatalog;
}) {
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<CheckoutOrigin | null>(null);
  const [error, setError] = useState<string | null>(null);
  // El estado de React no cambia entre dos clics del mismo tick; la ref sí.
  const inFlight = useRef(false);
  const cancelStuck = useRef<(() => void) | null>(null);
  // Estado Y ref, siempre juntos: un botón habilitado con la ref en true parece vivo pero no hace nada.
  const release = () => { cancelStuck.current?.(); cancelStuck.current = null; inFlight.current = false; setBusy(false); };
  // Vence el temporizador: visible = la navegación no ocurrió. Oculta (pestaña en segundo plano) = no se sabe aún:
  // se vuelve a mirar cuando la pestaña regrese; si la página sigue aquí, la navegación falló. `release` quita el oyente.
  const checkStuck = () => {
    if (document.visibilityState === 'visible') return release();
    const onVisible = () => { if (document.visibilityState === 'visible') release(); };
    document.addEventListener('visibilitychange', onVisible);
    cancelStuck.current = () => document.removeEventListener('visibilitychange', onVisible);
  };

  // Al volver de Stripe con "Atrás", el navegador puede restaurar la página congelada.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) release(); };
    window.addEventListener('pageshow', onShow);
    return () => { window.removeEventListener('pageshow', onShow); cancelStuck.current?.(); };
  }, []);

  async function start(items: readonly CheckoutItem[], from: CheckoutOrigin) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setOrigin(from);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // undefined ⇒ JSON.stringify quita la clave: sin permiso, el servidor no recibe ni un campo vacío.
        body: JSON.stringify({ items, attribution: attribution() }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t.errorStart);
      // Solo cuenta el pago que de verdad se abre: un 409 sin stock o un 429 no es un inicio de pago.
      const measured = checkoutItems(items, prices);
      if (measured.length) analytics.track({ name: 'begin_checkout', items: measured });
      window.location.assign(data.url);
      cancelStuck.current = schedule(checkStuck, NAVIGATION_STUCK_MS);
    } catch (e) {
      const msg = e instanceof TypeError ? t.errorNetwork : (e as Error).message;
      setError(`${msg} ${t.errorRetry}`);
      release();
    }
  }

  return <Ctx.Provider value={{ busy, origin, error, start, busyLabel: t.busy }}>{children}</Ctx.Provider>;
}

export function useCheckout(): CheckoutState {
  const s = useContext(Ctx);
  if (!s) throw new Error('useCheckout necesita <CheckoutProvider> alrededor de la ficha');
  return s;
}
