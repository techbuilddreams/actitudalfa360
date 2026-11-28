import { describe, expect, it } from 'vitest';
import { isIanaTimeZone } from '@/lib/iana-time-zone';

describe('isIanaTimeZone (solo nombres IANA)', () => {
  it.each(['UTC', 'America/New_York', 'America/Santo_Domingo', 'Pacific/Honolulu', 'Europe/Madrid', 'Asia/Kolkata', 'Asia/Calcutta'])(
    'acepta %s', (z) => expect(isIanaTimeZone(z)).toBe(true));
  it.each(['+05:00', '-0400', 'Mars/Base', '', 'A/'.repeat(900), '../../etc/passwd', 'utc ', 'America/New_York\n'])(
    'rechaza %j', (z) => expect(isIanaTimeZone(z)).toBe(false));
});
