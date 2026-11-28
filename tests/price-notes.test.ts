import { describe, expect, it } from 'vitest';
import { shippingNote } from '@/lib/price-notes';
import { usd } from '@/domain/money';

describe('shippingNote', () => {
  it('envío 0: «envío gratis», nunca $0.00', () => expect(shippingNote(usd(0), true)).toBe('envío gratis · más impuesto según tu estado'));
  it('sin impuesto automático, solo el envío fijo', () => {
    expect(shippingNote(usd(899), false)).toBe('envío fijo $8.99');
  });
  it('con impuesto automático, avisa antes de pagar que se suma', () => {
    expect(shippingNote(usd(899), true)).toBe('envío fijo $8.99 · más impuesto según tu estado');
  });
});
