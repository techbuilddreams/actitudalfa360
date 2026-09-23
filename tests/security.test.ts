import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/infrastructure/security/rate-limit';
import { isSameOrigin } from '@/infrastructure/security/request-guards';
import { decodeLines, encodeLines } from '@/domain/order';

describe('rate limiter', () => {
  it('bloquea después del límite y libera al pasar la ventana', () => {
    let t = 0;
    const rl = createRateLimiter(2, 1000, () => t);
    expect(rl.hit('ip').allowed).toBe(true);
    expect(rl.hit('ip').allowed).toBe(true);
    expect(rl.hit('ip').allowed).toBe(false);
    t = 1001;
    expect(rl.hit('ip').allowed).toBe(true);
  });
});

describe('isSameOrigin', () => {
  const site = 'https://actitudalfa360.com';
  it('acepta el propio origen y rechaza otros', () => {
    expect(isSameOrigin(new Headers({ origin: site }), site)).toBe(true);
    expect(isSameOrigin(new Headers({ origin: 'https://evil.com' }), site)).toBe(false);
    expect(isSameOrigin(new Headers({ referer: `${site}/productos/x` }), site)).toBe(true);
    expect(isSameOrigin(new Headers({}), site)).toBe(false);
  });
});

describe('metadata de líneas', () => {
  it('ida y vuelta', () => {
    const lines = [{ sku: 'A-1', quantity: 2 }, { sku: 'B-2', quantity: 1 }];
    expect(decodeLines(encodeLines(lines))).toEqual(lines);
    expect(decodeLines('basura,:,x:y')).toEqual([]);
  });
});

import { isAuthorized, safeEqual } from '@/infrastructure/security/basic-auth';

describe('staging basic auth', () => {
  it('acepta solo las credenciales correctas', () => {
    expect(isAuthorized(`Basic ${btoa('luis:secreto')}`, 'luis:secreto')).toBe(true);
    expect(isAuthorized(`Basic ${btoa('luis:otra')}`, 'luis:secreto')).toBe(false);
    expect(isAuthorized(null, 'luis:secreto')).toBe(false);
    expect(isAuthorized('Basic !!!', 'luis:secreto')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

import { clientIp } from '@/infrastructure/security/request-guards';
import { BodyTooLargeError, readTextLimited } from '@/lib/http';

describe('clientIp', () => {
  it('ignora lo que el cliente inventa al inicio de X-Forwarded-For', () => {
    const h = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });
    expect(clientIp(h, 1)).toBe('203.0.113.9');
    expect(clientIp(h, 2)).toBe('6.6.6.6');
    expect(clientIp(new Headers({ 'x-real-ip': '1.2.3.4' }))).toBe('1.2.3.4');
  });
});

describe('readTextLimited', () => {
  const req = (body: string, headers: Record<string, string> = {}) => new Request('https://x.test', { method: 'POST', body, headers });
  it('lee cuerpos dentro del límite', async () => {
    expect(await readTextLimited(req('{"a":1}'), 100)).toBe('{"a":1}');
  });
  it('rechaza por Content-Length sin leer', async () => {
    await expect(readTextLimited(req('x', { 'content-length': '999999' }), 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
  it('corta el stream si el cuerpo real excede el límite', async () => {
    await expect(readTextLimited(req('x'.repeat(500)), 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});
