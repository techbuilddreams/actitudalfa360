/** Defensa CSRF: la compra solo puede iniciarse desde nuestro propio sitio. */
export function isSameOrigin(headers: Headers, siteUrl: string): boolean {
  const allowed = new URL(siteUrl).origin;
  const origin = headers.get('origin');
  if (origin) return origin === allowed;
  const referer = headers.get('referer');
  if (!referer) return false;
  try {
    return new URL(referer).origin === allowed;
  } catch {
    return false;
  }
}

/**
 * IP del cliente para limitar abusos. El primer valor de X-Forwarded-For lo escribe el cliente (falsificable);
 * el confiable es el que agregó NUESTRO proxy: el N-ésimo desde la derecha (N = proxies de confianza).
 */
export function clientIp(headers: Headers, trustedHops = 1): string {
  const chain = (headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return chain.at(-trustedHops) ?? chain[0] ?? headers.get('x-real-ip') ?? 'unknown';
}
