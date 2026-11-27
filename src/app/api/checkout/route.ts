import { safeError } from '@/lib/safe-error.mjs';
import { z } from 'zod';
import { DomainError } from '@/domain/errors';
import { MAX_LINES, MAX_QTY_PER_LINE } from '@/domain/cart';
import { env } from '@/config/env';
import { checkoutLimiter, createCheckout, logger } from '@/infrastructure/container';
import { clientIp, isSameOrigin } from '@/infrastructure/security/request-guards';
import { BodyTooLargeError, json, readTextLimited } from '@/lib/http';

const Body = z.object({
  items: z
    .array(z.object({ sku: z.string().regex(/^[A-Z0-9-]{3,40}$/), quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE) }))
    .min(1)
    .max(MAX_LINES),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers, env().NEXT_PUBLIC_SITE_URL)) return json(403, { error: 'Origen no permitido.' });

  const rl = checkoutLimiter.hit(clientIp(req.headers));
  if (!rl.allowed) return json(429, { error: 'Demasiados intentos. Espera un minuto.' }, { 'Retry-After': String(rl.retryAfterSec) });

  if (!req.headers.get('content-type')?.startsWith('application/json')) return json(415, { error: 'Formato no válido.' });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(await readTextLimited(req, 4_096)));
  } catch (err) {
    if (err instanceof BodyTooLargeError) return json(413, { error: 'Petición demasiado grande.' });
    return json(400, { error: 'Petición no válida.' });
  }

  try {
    const { url } = await createCheckout()(body.items);
    return json(200, { url });
  } catch (err) {
    if (err instanceof DomainError) return json(400, { error: err.message });
    logger.error('checkout_failed', safeError(err));
    return json(502, { error: 'No se pudo iniciar el pago.' });
  }
}
