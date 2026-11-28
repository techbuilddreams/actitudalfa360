import { describe, expect, it } from 'vitest';
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  consentRegion,
  parseConsentCookie,
  resolveConsent,
  serializeConsentCookie,
} from '@/domain/consent';

describe('consentRegion', () => {
  it('EEE (27 de la UE + Islandia, Liechtenstein, Noruega), Reino Unido y Suiza piden permiso antes', () => {
    for (const c of ['DE', 'FR', 'ES', 'IT', 'IE', 'PT', 'NL', 'PL', 'SE', 'HR', 'CY', 'MT', 'IS', 'LI', 'NO', 'GB', 'CH'])
      expect(consentRegion(c), c).toBe('opt-in');
  });
  it('los 30 del EEE más GB y CH: exactamente 32 países', () => {
    const all = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH'.split(' ');
    expect(all).toHaveLength(32);
    for (const c of all) expect(consentRegion(c), c).toBe('opt-in');
  });
  it('territorios de la UE con código ISO propio y dependencias de la Corona: también piden permiso', () => {
    for (const c of ['AX', 'RE', 'GP', 'MQ', 'GF', 'YT', 'MF', 'GI', 'JE', 'GG', 'IM']) expect(consentRegion(c), c).toBe('opt-in');
  });
  it('EE. UU., RD, México, Puerto Rico: se mide salvo que digan no', () => {
    for (const c of ['US', 'DO', 'MX', 'PR', 'CA']) expect(consentRegion(c), c).toBe('opt-out');
  });
  it('sin país (local, cabecera ausente o basura) ⇒ el lado seguro: pedir permiso', () => {
    for (const c of [null, undefined, '', 'XX', 'usa', '  ']) expect(consentRegion(c), String(c)).toBe('opt-in');
  });
  it('la cabecera en minúsculas también vale', () => expect(consentRegion('de')).toBe('opt-in'));
  it('Grecia: Vercel puede mandar GR o EL; ambas cuentan', () => {
    expect(consentRegion('GR')).toBe('opt-in');
    expect(consentRegion('EL')).toBe('opt-in');
  });
});

describe('cookie de consentimiento', () => {
  it('ida y vuelta, versionada', () => {
    expect(parseConsentCookie(serializeConsentCookie('granted'))).toBe('granted');
    expect(parseConsentCookie(serializeConsentCookie('denied'))).toBe('denied');
  });
  it('cualquier otra cosa no es una elección', () => {
    for (const v of [undefined, null, '', 'granted', 'v0.granted', 'v1.maybe', 'v1.granted.extra']) expect(parseConsentCookie(v), String(v)).toBeNull();
  });
  it('nombre propio y caducidad de 6 meses (pauta CNIL: volver a preguntar)', () => {
    expect(CONSENT_COOKIE).toBe('aa_consent');
    expect(CONSENT_MAX_AGE_DAYS).toBe(180);
  });
});

describe('resolveConsent', () => {
  const r = (region: 'opt-in' | 'opt-out', gpc: boolean, stored: 'granted' | 'denied' | null) => resolveConsent({ region, gpc, stored });

  it('UE sin elección: no se mide y sale el banner', () =>
    expect(r('opt-in', false, null)).toEqual({ analytics: false, showBanner: true, showPreferences: true }));
  it('UE aceptó: se mide, sin banner, con enlace para retirarlo', () =>
    expect(r('opt-in', false, 'granted')).toEqual({ analytics: true, showBanner: false, showPreferences: true }));
  it('UE rechazó: no se mide y no se vuelve a preguntar', () =>
    expect(r('opt-in', false, 'denied')).toEqual({ analytics: false, showBanner: false, showPreferences: true }));
  it('EE. UU. sin elección: se mide, sin banner', () =>
    expect(r('opt-out', false, null)).toEqual({ analytics: true, showBanner: false, showPreferences: false }));
  it('EE. UU. con GPC: no se mide (lo exige California)', () =>
    expect(r('opt-out', true, null).analytics).toBe(false));
  it('GPC gana a una cookie aceptada, en cualquier región: es la señal más reciente y no se puede contestar', () => {
    for (const region of ['opt-in', 'opt-out'] as const) {
      expect(r(region, true, 'granted')).toEqual({ analytics: false, showBanner: false, showPreferences: false });
    }
  });
  it('una cookie rechazada se respeta también fuera de la UE', () => expect(r('opt-out', false, 'denied').analytics).toBe(false));
});
