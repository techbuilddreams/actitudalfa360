import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '@/domain/email';

describe('normalizeEmail', () => {
  it('recorta y pasa a minúsculas', () => expect(normalizeEmail('  Luis@Ejemplo.COM ')).toBe('luis@ejemplo.com'));
  it.each([['a@b'], [''], ['   '], ['a b@c.com'], ['a@b c.com'], ['a@@b.com'], ['a@b.c'], ['sin-arroba.com']])('rechaza %j', (v) =>
    expect(normalizeEmail(v)).toBeNull());
  it.each([[undefined], [null], [42], [{}], [['a@b.com']]])('rechaza no-string %j', (v) => expect(normalizeEmail(v)).toBeNull());
  it('máximo 254 caracteres', () => {
    const ok = `${'a'.repeat(242)}@ejemplo.com`; // 254
    expect(ok.length).toBe(254);
    expect(normalizeEmail(ok)).toBe(ok);
    expect(normalizeEmail(`a${ok}`)).toBeNull();
  });
});
