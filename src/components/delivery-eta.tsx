'use client';

import { useEffect, useState } from 'react';
import { estimateDelivery, type DayRange } from '@/domain/delivery';
import { formatEtaRange } from '@/lib/format-eta';

interface Props {
  shipping: { handlingDays: DayRange; transitDays: DayRange };
  /** Textos (copy.json → `eta`): el rango sin fecha ya viene rellenado desde site.shipping. */
  labels: { datedPre: string; datedMid: string; range: string };
  /** Reloj inyectable (tests). */
  now?: () => Date;
}

/**
 * «Llega aprox. entre …». La fecha depende del día del VISITANTE, no del de la build:
 * se calcula al montar. En el servidor (y antes de hidratar) va una línea neutra sin fechas.
 */
export function DeliveryEta({ shipping, labels: l, now = () => new Date() }: Props) {
  const [eta, setEta] = useState<{ from: string; to: string } | null>(null);


  useEffect(() => {
    const r = estimateDelivery(now(), shipping);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la fecha solo existe en el cliente
    setEta(formatEtaRange(r.from, r.to));
    // Se calcula una vez al montar; el reloj no cambia de día mientras se mira la ficha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return eta
    ? <b>{`${l.datedPre}${eta.from}${l.datedMid}${eta.to}`}</b>
    : <b>{l.range}</b>;
}
