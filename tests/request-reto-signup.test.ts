import { describe, expect, it, vi } from 'vitest';
import { makeRequestRetoSignup } from '@/application/use-cases/request-reto-signup';
import { DomainError } from '@/domain/errors';

const setup = () => {
  const request = vi.fn(async () => {});
  const run = makeRequestRetoSignup({ signup: { request }, isValidTimeZone: (z) => z === 'America/New_York' });
  return { request, run };
};
const ok = { email: ' Ana@Ejemplo.com ', timeZone: 'America/New_York', source: 'home' };

describe('requestRetoSignup', () => {
  it('normaliza el correo y llama al puerto', async () => {
    const { request, run } = setup();
    await run(ok);
    expect(request).toHaveBeenCalledWith({ email: 'ana@ejemplo.com', timeZone: 'America/New_York', source: 'home', membershipInterest: false });
  });
  it('membershipInterest: true viaja al puerto; sin él, false', async () => {
    const { request, run } = setup();
    await run({ ...ok, membershipInterest: true });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ membershipInterest: true }));
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
