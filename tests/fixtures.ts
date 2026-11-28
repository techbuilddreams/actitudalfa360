import { EMPTY_ATTRIBUTION } from '@/domain/attribution';
import { usd } from '@/domain/money';
import type { Order, OrderAmounts } from '@/domain/order';
import type { PaidCheckout } from '@/application/ports/payment-gateway';

export const amounts = (subtotal: number, shipping = 899, tax = 0, discount = 0): OrderAmounts => ({
  subtotal: usd(subtotal), shipping: usd(shipping), tax: usd(tax), discount: usd(discount),
});

export const address = { name: 'Luis Ramos', line1: '1 Main St', city: 'Troy', state: 'NY', postalCode: '12182', country: 'US' };

export const paidCheckout = (over: Partial<PaidCheckout> = {}): PaidCheckout => ({
  paymentRef: 'cs_test_123',
  lines: [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 1 }],
  total: usd(3398),
  amounts: amounts(2499),
  email: 'a@b.com',
  phone: null,
  shipping: address,
  attribution: EMPTY_ATTRIBUTION,
  ...over,
});

export const order = (over: Partial<Order> = {}): Order => ({
  id: 'o1', number: 10001, paymentRef: 'cs_test_abcdefgh12345678', status: 'paid',
  lines: [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 2, name: 'Taza negra 15 oz', unitCents: 2499 }],
  total: usd(5897), amounts: amounts(4998),
  email: 'cliente@example.com', phone: null, shipping: address, fulfillmentRef: null, utm: null, createdAt: new Date(),
  ...over,
});

export const noopLogger = { info: () => {}, warn: () => {}, error: () => {} };
