'use client';

import { kitItems } from '@/domain/kit';
import { useCheckout } from './use-checkout';

/** Kit de dos piezas en un solo checkout. La pieza de esta ficha va primero (cancelUrl vuelve a ella). */
export function KitButton({ currentSku, otherSku, label }: { currentSku: string; otherSku: string; label: string }) {
  const { busy, error, start } = useCheckout();
  return (
    <>
      <button className="btn ghost block" type="button" disabled={busy} aria-busy={busy}
        onClick={() => start(kitItems(currentSku, otherSku))}>
        {busy ? 'Abriendo pago seguro…' : label}
      </button>
      <p className="buy-error" role="status" aria-live="polite">{error}</p>
    </>
  );
}
