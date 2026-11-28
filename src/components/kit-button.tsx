'use client';

import { kitItems } from '@/domain/kit';
import { useCheckout } from './use-checkout';

/**
 * Kit de dos piezas (1 + 1) en un solo checkout. La pieza de esta ficha va primero (cancelUrl vuelve a ella).
 * Comparte el estado de pago de la ficha: si otro botón está abriendo Stripe, este queda deshabilitado.
 */
export function KitButton({ currentSku, otherSku, label }: { currentSku: string; otherSku: string; label: string }) {
  const { busy, busyLabel, origin, error, start } = useCheckout();
  const mine = origin === 'kit';
  return (
    <>
      <button className="btn ghost block" type="button" disabled={busy} aria-busy={busy && mine}
        onClick={() => start(kitItems(currentSku, otherSku), 'kit')}>
        {busy && mine ? busyLabel : label}
      </button>
      <p className="buy-error" role="status" aria-live="polite">{mine ? error : null}</p>
    </>
  );
}
