/**
 * Consentimiento de medición. Puro: país, señal GPC y cookie entran; qué se hace sale.
 * Decisión de Luis (2026-11-28): banner solo donde la ley pide permiso ANTES (EEE, Reino Unido, Suiza);
 * en el resto se mide salvo que la persona diga no, y GPC siempre es un no.
 */

export type ConsentRegion = 'opt-in' | 'opt-out';
export type ConsentChoice = 'granted' | 'denied';

/** EEE (UE-27 + IS, LI, NO), Reino Unido y Suiza. Grecia llega como GR o EL según la fuente. */
const OPT_IN = new Set(
  'AT BE BG HR CY CZ DK EE FI FR DE GR EL HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH'.split(' '),
);

/** Sin país fiable ⇒ se pide permiso: equivocarse hacia ese lado no cuesta nada. */
export function consentRegion(country: string | null | undefined): ConsentRegion {
  const c = (country ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c) || c === 'XX') return 'opt-in';
  return OPT_IN.has(c) ? 'opt-in' : 'opt-out';
}

export const CONSENT_COOKIE = 'aa_consent';
/** 6 meses: pasado ese tiempo se vuelve a preguntar (pauta de la CNIL). */
export const CONSENT_MAX_AGE_DAYS = 180;

const VERSION = 'v1';
export const serializeConsentCookie = (choice: ConsentChoice): string => `${VERSION}.${choice}`;
export function parseConsentCookie(value: string | null | undefined): ConsentChoice | null {
  if (value === `${VERSION}.granted`) return 'granted';
  if (value === `${VERSION}.denied`) return 'denied';
  return null;
}

export interface ConsentDecision {
  /** Se carga GA4. Si es false, no sale NINGUNA petición a Google (ni pings sin cookies). */
  analytics: boolean;
  showBanner: boolean;
  /** Enlace «Preferencias de cookies»: retirar el permiso tan fácil como darlo. */
  showPreferences: boolean;
}

export function resolveConsent(input: { region: ConsentRegion; gpc: boolean; stored: ConsentChoice | null }): ConsentDecision {
  const { region, gpc, stored } = input;
  if (gpc) return { analytics: false, showBanner: false, showPreferences: false };
  if (region === 'opt-in') return { analytics: stored === 'granted', showBanner: stored === null, showPreferences: true };
  return { analytics: stored !== 'denied', showBanner: false, showPreferences: false };
}
