// Tablas fijas en vez de Intl: el ICU de Node y el del navegador abrevian distinto ("sept" vs "sep."),
// y una diferencia entre servidor y cliente rompería la hidratación.
const WEEKDAYS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
const MONTHS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];

/** "vie. 4" / "mar. 15 de dic.": el mes va siempre al final del rango y al inicio solo si cambia de mes. */
export function formatEtaRange(from: Date, to: Date): { from: string; to: string } {
  const label = (d: Date, withMonth: boolean) =>
    `${WEEKDAYS[d.getDay()]} ${d.getDate()}${withMonth ? ` de ${MONTHS[d.getMonth()]}` : ''}`;
  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  return { from: label(from, !sameMonth), to: label(to, true) };
}
