import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { LogRetoSignup } from '@/infrastructure/signup/log-reto-signup';

describe('LogRetoSignup', () => {
  it('registra solo origen, zona, interés en la membresía y resultado: nada derivado del correo (ni hash)', async () => {
    const info = vi.fn();
    const email = 'ana@ejemplo.com';
    await new LogRetoSignup({ info, warn: vi.fn(), error: vi.fn() }).request({ email, timeZone: 'America/New_York', source: 'reto', membershipInterest: true });
    expect(info).toHaveBeenCalledTimes(1);
    const [event, fields] = info.mock.calls[0]!;
    expect(event).toBe('reto_signup_requested');
    expect(fields).toEqual({ source: 'reto', timeZone: 'America/New_York', membershipInterest: true, outcome: 'logged' });
    const line = JSON.stringify(info.mock.calls[0]);
    for (const algo of ['sha256', 'sha1', 'md5']) expect(line).not.toContain(createHash(algo).update(email).digest('hex').slice(0, 8));
    expect(line).not.toMatch(/ana|ejemplo/);
  });
});
