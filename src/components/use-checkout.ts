'use client';

import { useEffect, useState } from 'react';

export interface CheckoutItem { readonly sku: string; readonly quantity: number }

/**
 * Arranca Stripe Checkout. El servidor pone el precio: aquí solo viajan sku y cantidad.
 * Un solo sitio para el POST, el error reintentable y el regreso con «Atrás» (BuyBox, kit, barra fija).
 */
export function useCheckout() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al volver de Stripe con "Atrás", el navegador puede restaurar la página congelada.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setBusy(false); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  async function start(items: readonly CheckoutItem[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'No se pudo iniciar el pago.');
      window.location.assign(data.url);
    } catch (e) {
      const msg = e instanceof TypeError ? 'No se pudo conectar.' : (e as Error).message;
      setError(`${msg} Intenta de nuevo en un momento.`);
      setBusy(false);
    }
  }

  return { busy, error, start };
}
