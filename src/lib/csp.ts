/** Dominios que GA4 necesita (guía de CSP de Google para GA4): envío de eventos y la imagen de respaldo. */
const GA_CONNECT = ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'];
const GA_IMG = ['https://*.google-analytics.com', 'https://*.googletagmanager.com'];

/**
 * CSP estricta con nonce. Los scripts NO abren dominios: con 'strict-dynamic' basta con que los cree código con nonce.
 * Google solo entra en connect/img, y solo si hay medición configurada.
 */
export function buildCsp({ nonce, isDev, analytics }: { nonce: string; isDev: boolean; analytics: boolean }): string {
  const ga = (hosts: string[]) => (analytics ? ` ${hosts.join(' ')}` : '');
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    `img-src 'self' data: blob:${ga(GA_IMG)}`,
    `font-src 'self'`,
    `connect-src 'self'${ga(GA_CONNECT)}`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}
