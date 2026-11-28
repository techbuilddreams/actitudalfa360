import { describe, expect, it } from 'vitest';
import { kitItems } from '@/domain/kit';
import { DomainError } from '@/domain/errors';

describe('kitItems', () => {
  it('el SKU actual va primero (cancelUrl usa lines[0])', () =>
    expect(kitItems('AAA-1', 'BBB-2')).toEqual([{ sku: 'AAA-1', quantity: 1 }, { sku: 'BBB-2', quantity: 1 }]));
  it('SKUs iguales: DomainError', () => expect(() => kitItems('AAA-1', 'AAA-1')).toThrow(DomainError));
  it('SKU vacío: DomainError', () => {
    expect(() => kitItems('', 'BBB-2')).toThrow(DomainError);
    expect(() => kitItems('AAA-1', '  ')).toThrow(DomainError);
  });
});
