import { NextResponse, type NextRequest } from 'next/server';
import { measurementId } from '@/config/analytics';
import { buildCsp } from '@/lib/csp';

/**
 * CSP estricta con nonce por petición + encabezados de seguridad.
 * El acceso a staging lo cierra Vercel (Deployment Protection en los previews), no este código:
 * la petición sin sesión de Vercel ni siquiera llega aquí.
 */
export function proxy(request: NextRequest) {
  // Variable de servidor (se lee al ejecutar, no se congela en el build).
  const isStaging = process.env.APP_ENV === 'staging';

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  // Google solo entra en la CSP si hay medición configurada (y nunca en staging).
  const csp = buildCsp({ nonce, isDev, analytics: measurementId() !== null });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  if (isStaging) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    {
      // Todo excepto API (Stripe debe poder llegar al webhook), estáticos y archivos públicos.
      source: '/((?!api|_next/static|_next/image|img|fonts|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|merchant-feed.xml|\\.well-known).*)',
    },
  ],
};
