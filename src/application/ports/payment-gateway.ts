import type { Attribution } from '@/domain/attribution';
import type { Money } from '@/domain/money';
import type { OrderAmounts, OrderLine, ShippingAddress } from '@/domain/order';
import type { PricedCart } from '@/domain/cart';

export interface CheckoutRequest {
  readonly cart: PricedCart;
  readonly shipping: Money;
  readonly successUrl: string;
  readonly cancelUrl: string;
  /** Campaña y visita de GA4; vacía si la medición estaba apagada. */
  readonly attribution?: Attribution;
}

/** Pago confirmado, ya traducido del proveedor a nuestro lenguaje. */
export interface PaidCheckout {
  readonly paymentRef: string;
  readonly lines: readonly OrderLine[];
  readonly total: Money;
  readonly amounts: OrderAmounts;
  readonly email: string | null;
  readonly phone: string | null;
  readonly shipping: ShippingAddress | null;
  /** De qué campaña y visita de GA4 vino (solo si el navegador tenía la medición encendida). */
  readonly attribution: Attribution;
}

export interface CheckoutSummary {
  readonly paymentRef: string;
  readonly paid: boolean;
  readonly email: string | null;
  readonly total: Money | null;
}

export interface PaymentGateway {
  createCheckout(req: CheckoutRequest): Promise<{ url: string }>;
  /** Verifica la firma (lanza InvalidWebhookError) y devuelve el pago si el evento es un pago completado; null si se ignora. */
  parseWebhook(rawBody: string, signature: string): Promise<PaidCheckout | null>;
  getCheckoutSummary(paymentRef: string): Promise<CheckoutSummary | null>;
}
