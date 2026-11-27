import { env } from '@/config/env';
import { orderRepository, schemaStatus } from '@/infrastructure/container';
import { json } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * Salud para monitoreo (uptime). La base se verifica de verdad (SELECT 1) → 503 si no responde.
 * En producción solo dice ok/fallo: no revela la configuración a terceros.
 */
export async function GET() {
  const e = env();
  let database = false;
  try {
    await orderRepository().ping();
    database = Boolean(e.DATABASE_URL);
  } catch {
    database = false;
  }
  // behind = a la base le falta una migración que este código usa (p. ej. una rama que no migra): no está sano.
  const schema = database ? await schemaStatus() : 'unknown';
  const schemaOk = schema === 'ok' || schema === 'ahead';
  const ok = (database && schemaOk) || e.APP_ENV === 'local';
  if (e.APP_ENV === 'production') return json(ok ? 200 : 503, { ok });
  return json(ok ? 200 : 503, {
    ok,
    env: e.APP_ENV,
    stripe: Boolean(e.STRIPE_SECRET_KEY),
    stripeMode: e.STRIPE_SECRET_KEY?.includes('_live_') ? 'live' : e.STRIPE_SECRET_KEY ? 'test' : null,
    webhook: Boolean(e.STRIPE_WEBHOOK_SECRET),
    database,
    schema,
    printifyAutoOrder: e.PRINTIFY_AUTO_ORDER,
    email: Boolean(e.SMTP_USER && e.SMTP_PASSWORD),
  });
}
