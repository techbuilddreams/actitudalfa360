'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface CheckoutItem { readonly sku: string; readonly quantity: number }
/** Qué control abrió el pago: solo ese dice «Abriendo pago seguro…» y muestra el error. */
export type CheckoutOrigin = 'buy' | 'kit';

interface CheckoutState {
  busy: boolean;
  /** «Abriendo pago seguro…», desde copy.json. */
  busyLabel: string;
  origin: CheckoutOrigin | null;
  error: string | null;
  start(items: readonly CheckoutItem[], origin: CheckoutOrigin): Promise<void>;
}

/** Textos del pago (copy.json → `checkout`). El copy es solo de servidor: la ficha los pasa por props. */
export interface CheckoutMessages { busy: string; errorStart: string; errorNetwork: string; errorRetry: string }

const Ctx = createContext<CheckoutState | null>(null);

/**
 * UN estado de pago por ficha: comprar, la barra fija y el kit lo comparten, así que mientras cualquiera
 * está abriendo Stripe todos quedan deshabilitados (nunca dos sesiones de checkout a la vez).
 * El servidor pone el precio: aquí solo viajan sku y cantidad.
 */
export function CheckoutProvider({ children, messages: t }: { children: ReactNode; messages: CheckoutMessages }) {
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<CheckoutOrigin | null>(null);
  const [error, setError] = useState<string | null>(null);
  // El estado de React no cambia entre dos clics del mismo tick; la ref sí.
  const inFlight = useRef(false);

  // Al volver de Stripe con "Atrás", el navegador puede restaurar la página congelada.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) { inFlight.current = false; setBusy(false); }
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
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
        body: JSON.stringify({ items }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t.errorStart);
      window.location.assign(data.url);
    } catch (e) {
      const msg = e instanceof TypeError ? t.errorNetwork : (e as Error).message;
      setError(`${msg} ${t.errorRetry}`);
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <Ctx.Provider value={{ busy, origin, error, start, busyLabel: t.busy }}>{children}</Ctx.Provider>;
}

export function useCheckout(): CheckoutState {
  const s = useContext(Ctx);
  if (!s) throw new Error('useCheckout necesita <CheckoutProvider> alrededor de la ficha');
  return s;
}
