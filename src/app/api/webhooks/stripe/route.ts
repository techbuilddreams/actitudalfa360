import { InvalidWebhookError, RetryLaterError } from '@/domain/errors';
import { handlePayment, logger, paymentGateway } from '@/infrastructure/container';
import { BodyTooLargeError, json, readTextLimited } from '@/lib/http';
import { safeError } from '@/lib/safe-error.mjs';

export const runtime = 'nodejs';

const MAX_BODY = 512 * 1024; // los eventos de Stripe pesan pocos KB

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return json(400, { error: 'missing signature' });

  let raw: string;
  try {
    raw = await readTextLimited(req, MAX_BODY); // cuerpo crudo: indispensable para verificar la firma
  } catch (err) {
    if (err instanceof BodyTooLargeError) return json(413, { error: 'too large' });
    throw err;
  }

  let paid;
  try {
    paid = await paymentGateway().parseWebhook(raw, signature);
  } catch (err) {
    if (err instanceof InvalidWebhookError) {
      logger.warn('webhook_signature_invalid');
      return json(400, { error: 'invalid signature' });
    }
    // Configuración o red: 500 con su causa real en los logs (Stripe reintenta).
    logger.error('webhook_parse_failed', safeError(err));
    return json(500, { error: 'processing failed' });
  }
  if (!paid) return json(200, { received: true });

  try {
    await handlePayment()(paid);
    return json(200, { received: true });
  } catch (err) {
    // 500 → Stripe reintenta con espera creciente; la idempotencia evita pedidos dobles.
    if (err instanceof RetryLaterError) logger.info('webhook_retry_later', { paymentRef: paid.paymentRef });
    else logger.error('webhook_processing_failed', { paymentRef: paid.paymentRef, ...safeError(err) });
    return json(500, { error: 'processing failed' });
  }
}
