import { publicEnv } from '@/config/env';
import { site } from '@/config/site';
import { catalog } from '@/infrastructure/container';
import { llmsTxt } from '@/lib/llms-txt';

/** /llms.txt generado del catálogo: no puede volver a desfasarse de la tienda. Staging: 404. */
export function GET(): Response {
  if (site.isStaging) return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  return new Response(llmsTxt(catalog.all(), publicEnv().SHIPPING_FLAT_CENTS), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
