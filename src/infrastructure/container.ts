import 'server-only';
import { randomUUID } from 'node:crypto';
import { env, isProduction, publicEnv, requireEnv } from '@/config/env';
import { site } from '@/config/site';
import { flatShipping } from '@/domain/cart';
import { orderLabel } from '@/domain/order';
import { makeCreateCheckout } from '@/application/use-cases/create-checkout';
import { makeHandlePayment } from '@/application/use-cases/handle-payment';
import type { OrderRepository } from '@/application/ports/order-repository';
import { staticCatalog } from './catalog/static-catalog';
import { StripeGateway } from './stripe/stripe-gateway';
import { PrintifyFulfillment } from './printify/printify-fulfillment';
import { getDb } from './db/client';
import { checkSchema, type SchemaStatus } from './db/schema-status';
import { PostgresOrderRepository } from './db/postgres-order-repository';
import { InMemoryOrderRepository } from './memory/in-memory-order-repository';
import { consoleLogger } from './notify/console-logger';
import { LogNotifier } from './notify/log-notifier';
import { EmailNotifier } from './notify/email-notifier';
import { CompositeNotifier } from './notify/composite-notifier';
import { SmtpMailer } from './email/smtp-mailer';
import type { Notifier } from '@/application/ports/notifier';
import { makeRequestRetoSignup } from '@/application/use-cases/request-reto-signup';
import type { RetoSignup } from '@/application/ports/reto-signup';
import { LogRetoSignup } from './signup/log-reto-signup';
import { createRateLimiter } from './security/rate-limit';
import { isIanaTimeZone } from '@/lib/iana-time-zone';

/**
 * Composition root: el ÚNICO lugar que conecta casos de uso con adaptadores concretos.
 * Cambiar Stripe, Printify o la base de datos = cambiar una línea aquí.
 */
let payments: StripeGateway | undefined;
let orders: OrderRepository | undefined;
let notifier: Notifier | undefined;

export const catalog = staticCatalog;
export const logger = consoleLogger;
export const checkoutLimiter = createRateLimiter(10, 60_000);
export const pageLookupLimiter = createRateLimiter(30, 60_000); // /gracias consulta a Stripe: evita agotar su cuota

export const signupLimiter = createRateLimiter(5, 60_000);

function retoSignup(): RetoSignup {
  // F3: aquí entra el adaptador de Resend + suscriptores con doble opt-in (y el valor `resend` en env.ts).
  return new LogRetoSignup(logger);
}

export const requestRetoSignup = () => makeRequestRetoSignup({ signup: retoSignup(), isValidTimeZone: isIanaTimeZone });

export function paymentGateway(): StripeGateway {
  payments ??= new StripeGateway({
    secretKey: requireEnv('STRIPE_SECRET_KEY'),
    webhookSecret: env().STRIPE_WEBHOOK_SECRET,
    automaticTax: env().STRIPE_AUTOMATIC_TAX,
    deliveryDays: {
      min: site.shipping.handlingDays.min + site.shipping.transitDays.min,
      max: site.shipping.handlingDays.max + site.shipping.transitDays.max,
    },
  });
  return payments;
}

/** ¿La base tiene las migraciones que espera este código? (para /api/health). Sin base: 'unknown'. */
export async function schemaStatus(): Promise<SchemaStatus> {
  const url = env().DATABASE_URL;
  return url ? checkSchema(getDb(url, env().DB_POOL_SIZE)) : 'unknown';
}

export function orderRepository(): OrderRepository {
  if (orders) return orders;
  const url = env().DATABASE_URL;
  if (url) orders = new PostgresOrderRepository(getDb(url, env().DB_POOL_SIZE), logger);
  else if (isProduction()) throw new Error('DATABASE_URL es obligatoria en producción');
  else {
    logger.warn('Sin DATABASE_URL: pedidos en memoria (solo local)');
    orders = new InMemoryOrderRepository();
  }
  return orders;
}

function notifications(): Notifier {
  if (notifier) return notifier;
  const e = env();
  const list: Notifier[] = [new LogNotifier(logger)];
  if (e.SMTP_USER && e.SMTP_PASSWORD) {
    const mailer = new SmtpMailer({ host: e.SMTP_HOST, port: e.SMTP_PORT, user: e.SMTP_USER, password: e.SMTP_PASSWORD, from: e.MAIL_FROM });
    list.push(new EmailNotifier(mailer, logger, e.ORDER_NOTIFY_EMAIL));
  } else {
    logger.warn('Correo desactivado: faltan SMTP_USER/SMTP_PASSWORD');
  }
  notifier = new CompositeNotifier(list);
  return notifier;
}

/** El envío que se cobra: el mismo valor público que muestra el copy. */
export const checkoutShipping = () => flatShipping(publicEnv().SHIPPING_FLAT_CENTS);

export const createCheckout = () =>
  makeCreateCheckout({
    catalog,
    payments: paymentGateway(),
    shippingFor: checkoutShipping(),
    siteUrl: env().NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''),
  });

export const handlePayment = () =>
  makeHandlePayment({
    orders: orderRepository(),
    catalog,
    fulfillment: env().PRINTIFY_AUTO_ORDER
      ? new PrintifyFulfillment({ token: requireEnv('PRINTIFY_API_TOKEN'), shopId: requireEnv('PRINTIFY_SHOP_ID'), catalog })
      : null,
    notifier: notifications(),
    logger,
    newId: randomUUID,
    now: () => new Date(),
  });

/**
 * Datos para la página de gracias. Primero nuestra base (número de pedido real);
 * Stripe solo confirma el estado del pago. Nunca expone la dirección.
 */
export async function orderConfirmation(paymentRef: string) {
  const summary = await paymentGateway().getCheckoutSummary(paymentRef);
  if (!summary) return null;
  const order = await orderRepository().findByPaymentRef(summary.paymentRef).catch(() => undefined);
  return { ...summary, label: order ? orderLabel(order) : null };
}
