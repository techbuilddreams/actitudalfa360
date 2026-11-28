'use client';

import { useEffect, useState } from 'react';
import { estimateDelivery, type DayRange } from '@/domain/delivery';
import { formatEtaRange } from '@/lib/format-eta';

interface Props {
  shipping: { handlingDays: DayRange; transitDays: DayRange };
  /** Reloj inyectable (tests). */
  now?: () => Date;
}

/**
 * «Llega aprox. entre …». La fecha depende del día del VISITANTE, no del de la build:
 * se calcula al montar. En el servidor (y antes de hidratar) va una línea neutra sin fechas.
 */
export function DeliveryEta({ shipping, now = () => new Date() }: Props) {
  const [eta, setEta] = useState<{ from: string; to: string } | null>(null);
  const { handlingDays: h, transitDays: t } = shipping;

  useEffect(() => {
    const r = estimateDelivery(now(), shipping);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la fecha solo existe en el cliente
    setEta(formatEtaRange(r.from, r.to));
    // Se calcula una vez al montar; el reloj no cambia de día mientras se mira la ficha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return eta
    ? <b>{`Pídela hoy y llega aprox. entre el ${eta.from} y el ${eta.to}`}</b>
    : <b>{`Llega en ${h.min + t.min} a ${h.max + t.max} días hábiles`}</b>;
}
