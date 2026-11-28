import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => {});
let allowed = true;
vi.mock('@/infrastructure/container', async () => {
  const { makeRequestRetoSignup } = await import('@/application/use-cases/request-reto-signup');
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    signupLimiter: { hit: () => ({ allowed, retryAfterSec: 30 }) },
    requestRetoSignup: () => makeRequestRetoSignup({ signup: { request }, isValidTimeZone: (z) => z === 'America/New_York' }),
  };
});
vi.mock('@/config/env', () => ({ env: () => ({ NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com' }) }));

import { POST } from '@/app/api/reto/signup/route';

const call = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request('https://actitudalfa360.com/api/reto/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://actitudalfa360.com', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
const good = { email: 'ana@ejemplo.com', timeZone: 'America/New_York', source: 'home' };

beforeEach(() => { allowed = true; request.mockClear(); });

describe('POST /api/reto/signup', () => {
  it('202 { ok: true } y llama al puerto', async () => {
    const res = await call(good);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('mismo cuerpo de respuesta para un correo repetido (sin enumeración)', async () => {
    const a = await (await call(good)).json();
    const b = await (await call(good)).json();
    expect(b).toEqual(a);
  });
  it('correo inválido: 400 con mensaje en español', async () => {
    const res = await call({ ...good, email: 'nope' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/correo/i);
  });
  it('JSON roto: 400', async () => expect((await call('{')).status).toBe(400));
  it('origen ajeno: 403', async () => expect((await call(good, { origin: 'https://evil.com' })).status).toBe(403));
  it('limitado: 429 con Retry-After', async () => {
    allowed = false;
    const res = await call(good);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });
});
