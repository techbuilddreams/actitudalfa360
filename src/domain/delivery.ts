/** Fecha de calendario (Y/M/D locales) a medianoche local: sin horas ni husos que muevan el día. */
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Suma `n` días hábiles (lunes a viernes). Sin festivos (decisión pendiente). Si parte de un fin de semana, cuenta desde el lunes. */
export function addBusinessDays(date: Date, n: number): Date {
  const r = startOfDay(date);
  let left = n;
  while (left > 0) {
    r.setDate(r.getDate() + 1);
    const wd = r.getDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return r;
}

export interface DayRange {
  min: number;
  max: number;
}

/** Ventana de entrega: producción + tránsito, en días hábiles desde hoy. */
export function estimateDelivery(today: Date, s: { handlingDays: DayRange; transitDays: DayRange }): { from: Date; to: Date } {
  return {
    from: addBusinessDays(today, s.handlingDays.min + s.transitDays.min),
    to: addBusinessDays(today, s.handlingDays.max + s.transitDays.max),
  };
}
