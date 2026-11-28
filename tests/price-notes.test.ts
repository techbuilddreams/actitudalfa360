import { describe, expect, it } from 'vitest';
import { shippingNote } from '@/lib/price-notes';
import { usd } from '@/domain/money';

describe('shippingNote', () => {
  it('sin impuesto automático, solo el envío fijo', () => {
    expect(shippingNote(usd(899), false)).toBe('envío fijo $8.99');
  });
  it('con impuesto automático, avisa antes de pagar que se suma', () => {
    expect(shippingNote(usd(899), true)).toBe('envío fijo $8.99 · más impuesto según tu estado');
  });
});
