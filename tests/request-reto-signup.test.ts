import { describe, expect, it, vi } from 'vitest';
import { makeRequestRetoSignup } from '@/application/use-cases/request-reto-signup';
import { DomainError } from '@/domain/errors';

const setup = () => {
  const request = vi.fn(async () => {});
  // Doble de prueba del canonizador: acepta solo Nueva York, en cualquier caja, y la devuelve canónica.
  const run = makeRequestRetoSignup({ signup: { request }, canonicalTimeZone: (z) => (z.toLowerCase() === 'america/new_york' ? 'America/New_York' : null) });
  return { request, run };
};
const ok = { email: ' Ana@Ejemplo.com ', timeZone: 'America/New_York', source: 'home' };

describe('requestRetoSignup', () => {
  it('normaliza el correo y llama al puerto', async () => {
    const { request, run } = setup();
    await run(ok);
    expect(request).toHaveBeenCalledWith({ email: 'ana@ejemplo.com', timeZone: 'America/New_York', source: 'home', membershipInterest: false });
  });
  it('membershipInterest: true viaja al puerto', async () => {
    const { request, run } = setup();
    await run({ ...ok, membershipInterest: true });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ membershipInterest: true }));
  });
  it('membershipInterest ausente: false', async () => {
    const { request, run } = setup();
    expect('membershipInterest' in ok).toBe(false);
    await run(ok);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ membershipInterest: false }));
  });
  it.each([['null', null], ['"true"', 'true'], ['1', 1], ['0', 0]])('membershipInterest %s: inválido (solo true/false o ausente)', async (_n, v) => {
    const { request, run } = setup();
    await expect(run({ ...ok, membershipInterest: v })).rejects.toBeInstanceOf(DomainError);
    expect(request).not.toHaveBeenCalled();
  });
  it('la zona que llega al puerto es la CANÓNICA, no la que mandó el navegador', async () => {
    const { request, run } = setup();
    await run({ ...ok, timeZone: 'america/new_york' });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ timeZone: 'America/New_York' }));
  });
  it.each([
    ['correo', { ...ok, email: 'nope' }],
    ['zona', { ...ok, timeZone: 'Mars/Base' }],
    ['origen', { ...ok, source: 'otro' }],
    ['no-objeto', null],
    ['membresía no booleana', { ...ok, membershipInterest: 'sí' }],
  ])('entrada inválida (%s): DomainError y no llama al puerto', async (_n, input) => {
    const { request, run } = setup();
    await expect(run(input)).rejects.toThrow(DomainError);
    expect(request).not.toHaveBeenCalled();
  });
});
