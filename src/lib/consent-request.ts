import { measurementId } from '@/config/analytics';
import { CONSENT_COOKIE, consentRegion, parseConsentCookie, resolveConsent, type ConsentDecision } from '@/domain/consent';

/** País que escribe Vercel (no lo puede fijar el cliente) + GPC del navegador + la cookie de la elección. */
export function consentFromRequest(headers: Headers, cookie: string | undefined): ConsentDecision {
  return resolveConsent({
    region: consentRegion(headers.get('x-vercel-ip-country')),
    gpc: headers.get('sec-gpc')?.trim() === '1',
    stored: parseConsentCookie(cookie),
  });
}

/** Valor de una cookie desde la cabecera `Cookie` cruda (route handlers: sin `cookies()` de next/headers). */
export function cookieFromHeader(header: string | null, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/** La misma decisión que el layout, leída de la petición. */
export const consentOfRequest = (headers: Headers): ConsentDecision =>
  consentFromRequest(headers, cookieFromHeader(headers.get('cookie'), CONSENT_COOKIE));

/** Lo que el layout pasa a `ConsentManager`, o null si no hay medición (sin ID o en staging): entonces no se pinta nada. */
export function measurementProps(
  headers: Headers,
  cookie: string | undefined,
  env: Record<string, string | undefined> = process.env,
): { measurementId: string; decision: ConsentDecision } | null {
  const id = measurementId(env);
  return id ? { measurementId: id, decision: consentFromRequest(headers, cookie) } : null;
}
