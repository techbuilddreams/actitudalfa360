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
 * IP del cliente para limitar abusos, tal como la ve Vercel.
 * `x-vercel-forwarded-for` lo escribe Vercel y no cambia aunque haya un proxy delante (p. ej. Cloudflare);
 * `x-real-ip` también lo escribe Vercel. X-Forwarded-For solo no vale: fuera de Vercel lo escribe el cliente.
 */
export function clientIp(headers: Headers): string {
  return headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip')?.trim() || 'unknown';
}
