'use client';

import { useEffect, useRef, useState } from 'react';
import { MAX_QTY_PER_LINE } from '@/domain/cart';
import { useCheckout } from './use-checkout';

/** Etiquetas accesibles del selector de cantidad (copy.json → `pdp.qty`). */
export interface QtyLabels { group: string; less: string; more: string; value: string }

interface Props {
  sku: string;
  label: string;
  barLabel: string;
  name: string;
  /** Precio ya formateado por el servidor (sale del catálogo). */
  price: string;
  thumb: string;
  qtyLabels: QtyLabels;
}

/**
 * Cantidad (1..MAX_QTY_PER_LINE, el mismo límite que el servidor) + compra + barra fija móvil.
 * La barra la gobierna un CENTINELA justo después del botón, no el botón: así aparece también
 * si se llega por ancla o con el scroll restaurado, sin haber visto nunca el botón.
 * El estado de pago es el de la ficha (CheckoutProvider): si el kit está abriendo Stripe, aquí no se compra.
 */
export function BuyBox({ sku, label, barLabel, name, price, thumb, qtyLabels: q }: Props) {
  const [qty, setQty] = useState(1);
  const [bar, setBar] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const { busy, busyLabel, origin, error, start } = useCheckout();
  const mine = origin === 'buy';

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (e) setBar(!e.isIntersecting && e.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const set = (n: number) => setQty(Math.max(1, Math.min(MAX_QTY_PER_LINE, n)));
  const buy = () => start([{ sku, quantity: qty }], 'buy');

  return (
    <>
      <div className="qty-row">
        <div className="stepper" role="group" aria-label={q.group}>
          <button type="button" aria-label={q.less} onClick={() => set(qty - 1)} disabled={busy || qty <= 1}>−</button>
          <output aria-label={q.value} aria-live="polite">{qty}</output>
          <button type="button" aria-label={q.more} onClick={() => set(qty + 1)} disabled={busy || qty >= MAX_QTY_PER_LINE}>+</button>
        </div>
        <button className="btn block" type="button" onClick={buy} disabled={busy} aria-busy={busy && mine}>
          {busy && mine ? busyLabel : label}
        </button>
      </div>
      <div ref={sentinel} className="buy-sentinel" aria-hidden="true" />
      <p className="buy-error" role="status" aria-live="polite">{mine ? error : null}</p>

      <div className={`buybar${bar ? ' show' : ''}`} aria-hidden={!bar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="bb-img"><img src={thumb} alt="" width={44} height={44} sizes="44px" loading="lazy" decoding="async" /></div>
        <div><div className="bb-name">{name}</div><div className="bb-price num">{price}{qty > 1 ? ` × ${qty}` : ''}</div></div>
        <button className="btn sm" type="button" tabIndex={bar ? 0 : -1} onClick={buy} disabled={busy}>{barLabel}</button>
      </div>
    </>
  );
}
