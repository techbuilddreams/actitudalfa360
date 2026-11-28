import { describe, expect, it } from 'vitest';
import { measurementId, purchaseReporting } from '@/config/analytics';
import { parseEnv } from '@/config/deploy-rules';
import { buildCsp } from '@/lib/csp';
import { consentFromRequest, measurementProps } from '@/lib/consent-request';

describe('measurementId', () => {
  it('producción con ID válido ⇒ el ID', () =>
    expect(measurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-AB12CD34EF', NEXT_PUBLIC_APP_ENV: 'production' })).toBe('G-AB12CD34EF'));
  it('solo producción mide (lista blanca): sin entorno, local o Staging no', () => {
    for (const e of [undefined, 'local', 'Staging', 'preview'])
      expect(measurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-AB12CD34EF', NEXT_PUBLIC_APP_ENV: e }), String(e)).toBeNull();
  });
  it('staging nunca mide: ensuciaría los datos reales', () =>
    expect(measurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-AB12CD34EF', NEXT_PUBLIC_APP_ENV: 'staging' })).toBeNull());
  it('sin ID o con ID raro ⇒ no hay medición', () => {
    expect(measurementId({})).toBeNull();
    expect(measurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'UA-123-1' })).toBeNull();
    expect(measurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-x"><script>' })).toBeNull();
  });
  it('un ID mal escrito tumba la build, no se apaga en silencio', () => {
    expect(parseEnv({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'UA-123-1' }).success).toBe(false);
    expect(parseEnv({ NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-AB12CD34EF' }).success).toBe(true);
  });
});

describe('buildCsp', () => {
  const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

  it('sin GA: ni un dominio de Google', () => {
    const csp = buildCsp({ nonce: 'n', isDev: false, analytics: false });
    expect(csp).not.toMatch(/google/);
    expect(directive(csp, 'connect-src')).toBe(`connect-src 'self'`);
  });
  it('con GA: envío a GA4 (incluida la región) e imagen de respaldo; scripts siguen solo con nonce', () => {
    const csp = buildCsp({ nonce: 'n', isDev: false, analytics: true });
    for (const host of ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'])
      expect(directive(csp, 'connect-src')).toContain(host);
    expect(directive(csp, 'img-src')).toContain('https://*.google-analytics.com');
    expect(directive(csp, 'script-src')).toBe(`script-src 'self' 'nonce-n' 'strict-dynamic'`);
  });
  it('conserva lo que ya había', () => {
    const csp = buildCsp({ nonce: 'n', isDev: false, analytics: true });
    for (const d of [`frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`, `base-uri 'self'`, 'upgrade-insecure-requests'])
      expect(csp).toContain(d);
  });
});

describe('consentFromRequest', () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it('país de Vercel + sin cookie: UE pide, EE. UU. mide', () => {
    expect(consentFromRequest(h({ 'x-vercel-ip-country': 'DE' }), undefined).showBanner).toBe(true);
    expect(consentFromRequest(h({ 'x-vercel-ip-country': 'US' }), undefined).analytics).toBe(true);
  });
  it('Sec-GPC: 1 ⇒ no se mide', () =>
    expect(consentFromRequest(h({ 'x-vercel-ip-country': 'US', 'sec-gpc': '1' }), undefined).analytics).toBe(false));
  it('Sec-GPC con otro valor no cuenta (la especificación solo define "1")', () =>
    expect(consentFromRequest(h({ 'x-vercel-ip-country': 'US', 'sec-gpc': '0' }), undefined).analytics).toBe(true));
  it('la cookie decide en la UE', () =>
    expect(consentFromRequest(h({ 'x-vercel-ip-country': 'FR' }), 'v1.granted')).toEqual({ analytics: true, showBanner: false, showPreferences: true }));
});

describe('measurementProps (lo que el layout pasa al gestor)', () => {
  const env = { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-AB12CD34EF', NEXT_PUBLIC_APP_ENV: 'production' };
  it('sin ID ⇒ null: ni banner, ni enlace, ni Google', () =>
    expect(measurementProps(new Headers({ 'x-vercel-ip-country': 'DE' }), undefined, { NEXT_PUBLIC_APP_ENV: 'production' })).toBeNull());
  it('con ID ⇒ ID + decisión', () =>
    expect(measurementProps(new Headers({ 'x-vercel-ip-country': 'DE' }), undefined, env)).toEqual({
      measurementId: 'G-AB12CD34EF', decision: { analytics: false, showBanner: true, showPreferences: true },
    }));
});

describe('purchaseReporting (¿se manda `purchase` desde el servidor?)', () => {
  const base = { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-AB12CD34EF', NEXT_PUBLIC_APP_ENV: 'production', GA_API_SECRET: 'abcdefghijklmnop' };
  it('producción + ID + secreto ⇒ los dos', () =>
    expect(purchaseReporting(base)).toEqual({ measurementId: 'G-AB12CD34EF', apiSecret: 'abcdefghijklmnop' }));
  it('sin secreto, o fuera de producción ⇒ null (misma lista blanca que el navegador)', () => {
    expect(purchaseReporting({ ...base, GA_API_SECRET: undefined })).toBeNull();
    expect(purchaseReporting({ ...base, GA_API_SECRET: '  ' })).toBeNull();
    expect(purchaseReporting({ ...base, NEXT_PUBLIC_APP_ENV: 'staging' })).toBeNull();
    expect(purchaseReporting({ ...base, NEXT_PUBLIC_GA_MEASUREMENT_ID: undefined })).toBeNull();
  });
});
