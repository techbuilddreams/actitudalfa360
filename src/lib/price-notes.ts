import { formatMoney, type Money } from '@/domain/money';

/** Línea de envío junto al precio. Con envío 0 dice «envío gratis», nunca «$0.00». Si Stripe suma impuesto, se avisa antes del pago. */
export const shippingNote = (shipping: Money, automaticTax: boolean): string =>
  `${shipping.cents === 0 ? 'envío gratis' : `envío fijo ${formatMoney(shipping)}`}${automaticTax ? ' · más impuesto según tu estado' : ''}`;
