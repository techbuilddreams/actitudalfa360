// La ruta REAL del alta con el contenedor REAL (sin mocks del caso de uso).
import { afterEach, describe, expect, it, vi } from 'vitest';

const good = { email: 'ana@ejemplo.com', timeZone: 'Pacific/Honolulu', source: 'home' };
async function route(envs: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://actitudalfa360.com');
  for (const [k, v] of Object.entries(envs)) vi.stubEnv(k, v);
  const { POST } = await import('@/app/api/reto/signup/route');
  return (body: BodyInit, h: Record<string, string> = {}) => POST(new Request('https://actitudalfa360.com/api/reto/signup', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://actitudalfa360.com', 'x-vercel-forwarded-for': String(Math.random()), ...h },
    body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  } as RequestInit));
}
const j = (o: unknown) => JSON.stringify(o);
afterEach(() => vi.unstubAllEnvs());

describe('ruta real /api/reto/signup (contenedor real)', () => {
  it.each(['local', 'staging'])('APP_ENV=%s con la configuración por defecto: 202', async (appEnv) => {
    const call = await route({ APP_ENV: appEnv });
    expect((await call(j(good))).status).toBe(202);
  });
  it.each([
    ['objeto', { toString: 'x' }], ['número', 5], ['largo', 'A/'.repeat(900)], ['ruta', '../../etc/passwd'], ['vacío', ''], ['offset', '+05:00'],
  ])('timeZone malformado (%s): 400, nunca 5xx', async (_n, tz) => {
    const call = await route({});
    expect((await call(j({ ...good, timeZone: tz }))).status).toBe(400);
  });
  it('cuerpo de 3 KB sin content-length (stream): 413', async () => {
    const call = await route({});
    const big = j({ ...good, pad: 'x'.repeat(3000) });
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
    expect((await call(stream)).status).toBe(413);
  });
  it('origen con sufijo engañoso o null: 403', async () => {
    const call = await route({});
    expect((await call(j(good), { origin: 'https://actitudalfa360.com.evil.com' })).status).toBe(403);
    expect((await call(j(good), { origin: 'null' })).status).toBe(403);
  });
  it('content-type text/plain: 415', async () => {
    const call = await route({});
    expect((await call(j(good), { 'content-type': 'text/plain' })).status).toBe(415);
  });
});
