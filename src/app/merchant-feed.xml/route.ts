import { publicEnv } from '@/config/env';
import { site } from '@/config/site';
import { catalog } from '@/infrastructure/container';
import { merchantFeedXml } from '@/lib/merchant-feed';

/** Feed de Google Merchant Center. Staging: 404 y noindex, nunca un feed que Google pueda descargar. */
export function GET(): Response {
  if (site.isStaging) return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  return new Response(merchantFeedXml(catalog.all(), publicEnv().SHIPPING_FLAT_CENTS), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Google lo descarga 1×/día: 1 h en CDN y hasta 1 día sirviendo viejo mientras revalida.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
