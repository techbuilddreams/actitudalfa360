import { describe, expect, it, vi } from 'vitest';
import { LogRetoSignup } from '@/infrastructure/signup/log-reto-signup';

describe('LogRetoSignup', () => {
  it('registra sin el correo en claro', async () => {
    const info = vi.fn();
    await new LogRetoSignup({ info, warn: vi.fn(), error: vi.fn() }).request({ email: 'ana@ejemplo.com', timeZone: 'America/New_York', source: 'reto' });
    expect(info).toHaveBeenCalledTimes(1);
    const line = JSON.stringify(info.mock.calls[0]);
    expect(line).not.toContain('ana@ejemplo.com');
    expect(line).not.toContain('ana@');
    expect(line).toContain('America/New_York');
  });
});
