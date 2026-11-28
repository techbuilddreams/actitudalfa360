import { DomainError } from '@/domain/errors';
import { env } from '@/config/env';
import { logger, requestRetoSignup, signupLimiter } from '@/infrastructure/container';
import { clientIp, isSameOrigin } from '@/infrastructure/security/request-guards';
import { safeError } from '@/lib/safe-error.mjs';
import { BodyTooLargeError, json, readTextLimited } from '@/lib/http';

/**
 * Alta en el reto. Misma respuesta (202) haya o no el correo en la lista: no se puede enumerar quién está.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req.headers, env().NEXT_PUBLIC_SITE_URL)) return json(403, { error: 'Origen no permitido.' });

  const rl = signupLimiter.hit(clientIp(req.headers));
  if (!rl.allowed) return json(429, { error: 'Demasiados intentos. Espera un minuto.' }, { 'Retry-After': String(rl.retryAfterSec) });

  if (!req.headers.get('content-type')?.startsWith('application/json')) return json(415, { error: 'Formato no válido.' });
  let body: unknown;
  try {
    body = JSON.parse(await readTextLimited(req, 2_048));
  } catch (err) {
    if (err instanceof BodyTooLargeError) return json(413, { error: 'Petición demasiado grande.' });
    return json(400, { error: 'Petición no válida.' });
  }

  try {
    await requestRetoSignup()(body);
    return json(202, { ok: true });
  } catch (err) {
    if (err instanceof DomainError) return json(400, { error: err.message });
    logger.error('reto_signup_failed', safeError(err));
    return json(502, { error: 'No pudimos registrar tu correo. Intenta de nuevo.' });
  }
}
