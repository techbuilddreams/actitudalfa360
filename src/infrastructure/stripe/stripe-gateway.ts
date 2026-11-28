import 'server-only';
import Stripe from 'stripe';
import { usd } from '@/domain/money';
import { InvalidWebhookError } from '@/domain/errors';
import { attributionFromMetadata, attributionToMetadata } from '@/domain/attribution';
import { decodeLines, encodeLines, type OrderLine, type ShippingAddress } from '@/domain/order';
import type { CheckoutRequest, CheckoutSummary, PaidCheckout, PaymentGateway } from '@/application/ports/payment-gateway';

const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

interface Options {
  secretKey: string;
  webhookSecret?: string;
  automaticTax: boolean;
  deliveryDays: { min: number; max: number };
}

/** Adaptador Stripe: traduce entre Stripe y nuestro dominio. Nada fuera de aquí conoce Stripe. */
export class StripeGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor(private readonly opts: Options) {
    this.stripe = new Stripe(opts.secretKey, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: 'actitudalfa360' } });
  }

  async createCheckout(req: CheckoutRequest): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create(buildCheckoutSessionParams(req, this.opts));
    if (!session.url) throw new Error('Stripe no devolvió URL de checkout');
    return { url: session.url };
  }

  async parseWebhook(rawBody: string, signature: string): Promise<PaidCheckout | null> {
    // Falta de configuración ≠ firma inválida: esto lanza un Error normal (500) para que se note en los logs.
    if (!this.opts.webhookSecret) throw new Error('Falta STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;
    try {
      // Lanza si la firma no es válida o el evento es viejo (tolerancia 300 s por defecto).
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.opts.webhookSecret);
    } catch (err) {
      if (err instanceof Stripe.errors.StripeSignatureVerificationError) throw new InvalidWebhookError();
      throw err;
    }
    if (!HANDLED.has(event.type)) return null;

    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== 'paid') return null;

    const cents = (n: number | null | undefined) => usd(n ?? 0);
    return {
      paymentRef: s.id,
      lines: await this.linesOf(s),
      total: cents(s.amount_total),
      amounts: {
        subtotal: cents(s.amount_subtotal),
        discount: cents(s.total_details?.amount_discount),
        shipping: cents(s.total_details?.amount_shipping),
        tax: cents(s.total_details?.amount_tax),
      },
      email: s.customer_details?.email ?? null,
      phone: s.customer_details?.phone ?? null,
      shipping: toAddress(s),
      attribution: attributionFromMetadata(s.metadata),
    };
  }

  /** Líneas desde la metadata; si faltara, se reconstruyen desde Stripe para no perder nunca un pedido pagado. */
  private async linesOf(s: Stripe.Checkout.Session): Promise<OrderLine[]> {
    const fromMeta = decodeLines(s.metadata?.lines ?? '');
    if (fromMeta.length > 0) return fromMeta;
    const items = await this.stripe.checkout.sessions.listLineItems(s.id, { limit: 100, expand: ['data.price.product'] });
    return items.data.flatMap((li) => {
      const product = li.price?.product;
      const sku = product && typeof product === 'object' && !('deleted' in product && product.deleted) ? product.metadata?.sku : undefined;
      return sku && li.quantity ? [{ sku, quantity: li.quantity }] : [];
    });
  }

  async getCheckoutSummary(paymentRef: string): Promise<CheckoutSummary | null> {
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(paymentRef)) return null;
    try {
      const s = await this.stripe.checkout.sessions.retrieve(paymentRef);
      return {
        paymentRef: s.id,
        paid: s.payment_status === 'paid',
        email: s.customer_details?.email ?? null,
        total: s.amount_total != null ? usd(s.amount_total) : null,
      };
    } catch {
      return null;
    }
  }
}

/** La dirección vive en lugares distintos según la versión del API; cubrimos ambos. */
function toAddress(s: Stripe.Checkout.Session): ShippingAddress | null {
  type Ship = { name?: string | null; address?: Stripe.Address | null } | null | undefined;
  const loose = s as unknown as { shipping_details?: Ship; collected_information?: { shipping_details?: Ship } | null };
  const ship = loose.collected_information?.shipping_details ?? loose.shipping_details;
  const a = ship?.address;
  if (!ship || !a) return null;
  return {
    name: ship.name ?? s.customer_details?.name ?? '',
    line1: a.line1 ?? '',
    line2: a.line2 ?? null,
    city: a.city ?? '',
    state: a.state ?? '',
    postalCode: a.postal_code ?? '',
    country: a.country ?? 'US',
  };
}

/** Parámetros de la sesión de pago: función pura, testeable sin red. Precio y envío salen siempre del servidor. */
export function buildCheckoutSessionParams(
  req: CheckoutRequest,
  opts: Pick<Options, 'automaticTax' | 'deliveryDays'>,
): Stripe.Checkout.SessionCreateParams {
  const lines = req.cart.lines.map((l) => ({ sku: l.variant.sku, quantity: l.quantity }));
  return {
    mode: 'payment',
    locale: 'es',
    line_items: req.cart.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: l.variant.price.currency,
        unit_amount: l.variant.price.cents,
        tax_behavior: 'exclusive', // precio sin impuesto; Stripe Tax lo suma si está activo
        product_data: {
          name: `${l.product.name} — ${l.variant.label}`,
          metadata: { sku: l.variant.sku },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: 'Envío estándar EE. UU.',
          fixed_amount: { amount: req.shipping.cents, currency: req.shipping.currency },
          tax_behavior: 'exclusive',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: opts.deliveryDays.min },
            maximum: { unit: 'business_day', value: opts.deliveryDays.max },
          },
        },
      },
    ],
    phone_number_collection: { enabled: false }, // Printify no lo exige; un campo menos en el pago
    automatic_tax: { enabled: opts.automaticTax },
    success_url: req.successUrl,
    cancel_url: req.cancelUrl,
    // La atribución solo en la sesión: el PaymentIntent no necesita el ID de GA4.
    metadata: { lines: encodeLines(lines), ...(req.attribution ? attributionToMetadata(req.attribution) : {}) },
    payment_intent_data: { metadata: { lines: encodeLines(lines) } },
  };
}
