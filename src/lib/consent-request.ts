import { measurementId } from '@/config/analytics';
import { consentRegion, parseConsentCookie, resolveConsent, type ConsentDecision } from '@/domain/consent';

/** País que escribe Vercel (no lo puede fijar el cliente) + GPC del navegador + la cookie de la elección. */
export function consentFromRequest(headers: Headers, cookie: string | undefined): ConsentDecision {
  return resolveConsent({
    region: consentRegion(headers.get('x-vercel-ip-country')),
    gpc: headers.get('sec-gpc')?.trim() === '1',
    stored: parseConsentCookie(cookie),
  });
}

/** Lo que el layout pasa a `ConsentManager`, o null si no hay medición (sin ID o en staging): entonces no se pinta nada. */
export function measurementProps(
  headers: Headers,
  cookie: string | undefined,
  env: Record<string, string | undefined> = process.env,
): { measurementId: string; decision: ConsentDecision } | null {
  const id = measurementId(env);
  return id ? { measurementId: id, decision: consentFromRequest(headers, cookie) } : null;
}
