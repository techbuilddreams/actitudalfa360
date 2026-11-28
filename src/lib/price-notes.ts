import { formatMoney, type Money } from '@/domain/money';

/** Línea de envío junto al precio. Si Stripe suma impuesto, se avisa antes del pago, no en él. */
export const shippingNote = (shipping: Money, automaticTax: boolean): string =>
  `envío fijo ${formatMoney(shipping)}${automaticTax ? ' · más impuesto según tu estado' : ''}`;
