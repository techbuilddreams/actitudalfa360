/**
 * Nombre de zona IANA en su forma CANÓNICA, o null si no lo es.
 *
 * - Vale cualquier zona que el motor reconozca (`Intl.DateTimeFormat` dentro de try/catch), `Etc/*` incluidas:
 *   Windows «UTC-05:00» sin horario de verano y muchos Linux reportan `Etc/GMT+5`. No se exige la lista de
 *   `Intl.supportedValuesOf`, que deja fuera `Etc/*` y alias según el ICU de cada motor.
 * - Se rechazan los desfases («+05:00», «-0300», «GMT+5»): Intl los acepta, pero no sirven para programar el correo
 *   diario por calendario local (no siguen el horario de verano).
 * - Se devuelve `resolvedOptions().timeZone`: «america/santo_domingo» → «America/Santo_Domingo». Lo que se guarda es
 *   siempre esa forma; un alias (Asia/Calcutta ↔ Asia/Kolkata) queda como lo resuelva el motor, y es estable.
 */
const SHAPE = /^[A-Za-z0-9_+\-/]{1,64}$/;
const OFFSET = /^(?:(?:GMT|UTC)?[+-]\d{1,2}(?::?\d{2})?)$/i;

export function canonicalTimeZone(zone: string): string | null {
  if (!SHAPE.test(zone) || OFFSET.test(zone)) return null;
  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
  // Defensa en profundidad: lo canónico tampoco puede ser un desfase.
  return OFFSET.test(resolved) ? null : resolved;
}
