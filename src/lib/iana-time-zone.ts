/**
 * ¿Es un nombre de zona IANA? `Intl.DateTimeFormat` acepta también desfases («+05:00») y no sirven para
 * programar el correo diario por calendario local, así que se exige un nombre de la lista de Intl o «UTC».
 * Los alias (Asia/Kolkata ↔ Asia/Calcutta, según el ICU de cada motor) valen si su forma canónica está en la lista.
 */
let zones: Set<string> | undefined;
const NAME = /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/;

export function isIanaTimeZone(zone: string): boolean {
  if (zone === 'UTC') return true;
  if (zone.length > 64 || !NAME.test(zone)) return false;
  zones ??= new Set(Intl.supportedValuesOf('timeZone'));
  if (zones.has(zone)) return true;
  try {
    return zones.has(new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone);
  } catch {
    return false;
  }
}
