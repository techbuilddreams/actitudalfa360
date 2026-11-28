import { describe, expect, it } from 'vitest';
import { canonicalTimeZone } from '@/lib/iana-time-zone';

describe('canonicalTimeZone (nombres IANA, en su forma canónica)', () => {
  it.each(['UTC', 'America/New_York', 'America/Santo_Domingo', 'Pacific/Honolulu', 'Europe/Madrid', 'Asia/Kolkata', 'Etc/GMT+5', 'Etc/GMT-14', 'Etc/UTC', 'America/Argentina/Buenos_Aires'])(
    'acepta %s', (z) => expect(canonicalTimeZone(z)).not.toBeNull());
  it.each(['+05:00', '-0300', '-0400', '+5', 'GMT+5', 'UTC-03:00', 'Mars/Base', '', 'A/'.repeat(900), '../../etc/passwd', 'utc ', 'America/New_York\n', 'A/' + 'b'.repeat(200)])(
    'rechaza %j', (z) => expect(canonicalTimeZone(z)).toBeNull());

  // Sonda ATAQUE 4 del Rompedor r3: el motor acepta zonas heredadas que el tzdata moderno (p. ej. Postgres) ya no tiene.
  it.each(['SystemV/AST4', 'SystemV/EST5EDT', 'systemv/pst8pdt'])('rechaza la zona heredada %s', (z) => expect(canonicalTimeZone(z)).toBeNull());

  it('canoniza mayúsculas: america/santo_domingo → America/Santo_Domingo', () =>
    expect(canonicalTimeZone('america/santo_domingo')).toBe('America/Santo_Domingo'));
  it('Etc/GMT+5 se queda como Etc/GMT+5 (el signo POSIX no se toca)', () => expect(canonicalTimeZone('Etc/GMT+5')).toBe('Etc/GMT+5'));
  it('Asia/Calcutta: lo que resuelva este motor, pero estable y válido', () => {
    const c = canonicalTimeZone('Asia/Calcutta');
    expect(c).toMatch(/^Asia\/(Kolkata|Calcutta)$/);
    expect(canonicalTimeZone(c!)).toBe(c);
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: c! })).not.toThrow();
  });
});
