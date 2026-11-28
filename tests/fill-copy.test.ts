import { describe, expect, it } from 'vitest';
import { fillCopy } from '@/lib/fill-copy';

describe('fillCopy', () => {
  it('rellena marcadores en strings anidados y en arrays', () => {
    const src = { a: 'Envío {envio}', b: ['fijo {envio}', 'nada'], c: { d: '{envio} y {envio}' }, n: 3 };
    expect(fillCopy(src, { envio: '$8.99' })).toEqual({ a: 'Envío $8.99', b: ['fijo $8.99', 'nada'], c: { d: '$8.99 y $8.99' }, n: 3 });
  });

  it('no muta el original', () => {
    const src = { a: '{envio}' };
    fillCopy(src, { envio: 'x' });
    expect(src.a).toBe('{envio}');
  });

  it('falla en voz alta con un marcador desconocido (un error tipográfico no llega a la web)', () => {
    expect(() => fillCopy({ a: 'Envío {envo}' }, { envio: '$8.99' })).toThrow(/envo/);
  });
});
