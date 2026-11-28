import { describe, expect, it } from 'vitest';
import { orderLabel } from '@/domain/order';

describe('orderLabel', () => {
  it('con número: prefijo de marca AA360', () =>
    expect(orderLabel({ number: 10001, paymentRef: 'cs_test_abc' })).toBe('AA360-10001'));
  it('sin número todavía: final del id de pago en mayúsculas', () =>
    expect(orderLabel({ number: null, paymentRef: 'cs_test_a1b2c3d4e5' })).toBe('B2C3D4E5'));
});
