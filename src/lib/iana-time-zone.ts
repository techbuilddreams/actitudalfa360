/**
 * Nombre de zona IANA en su forma CANÓNICA, o null si no lo es.
 *
 * - El motor tiene que reconocerla (`Intl.DateTimeFormat` dentro de try/catch) Y su forma resuelta tiene que estar en
 *   `Intl.supportedValuesOf('timeZone')` ∪ `Etc/*` ∪ `UTC`. Esa lista deja fuera `Etc/*` (Windows «UTC-05:00» sin
 *   horario de verano y muchos Linux reportan `Etc/GMT+5`), por eso se añaden; y deja fuera las heredadas que el motor
 *   aún acepta (`SystemV/AST4`) pero el tzdata moderno, p. ej. el de Postgres, ya no: esas se rechazan.
 * - Se rechazan los desfases («+05:00», «-0300», «GMT+5»): Intl los acepta, pero no sirven para programar el correo
 *   diario por calendario local (no siguen el horario de verano).
 * - Se devuelve `resolvedOptions().timeZone`: «america/santo_domingo» → «America/Santo_Domingo». Lo que se guarda es
 *   siempre esa forma; un alias (Asia/Calcutta ↔ Asia/Kolkata) queda como lo resuelva el motor, y es estable.
 */
const SHAPE = /^[A-Za-z0-9_+\-/]{1,64}$/;
const OFFSET = /^(?:(?:GMT|UTC)?[+-]\d{1,2}(?::?\d{2})?)$/i;

let supported: ReadonlySet<string> | undefined;
const supportedZones = () => (supported ??= new Set(Intl.supportedValuesOf('timeZone')));
const isListed = (z: string) => z === 'UTC' || z.startsWith('Etc/') || supportedZones().has(z);

export function canonicalTimeZone(zone: string): string | null {
  if (!SHAPE.test(zone) || OFFSET.test(zone)) return null;
  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
  // Defensa en profundidad: lo canónico tampoco puede ser un desfase.
  return OFFSET.test(resolved) || !isListed(resolved) ? null : resolved;
}
