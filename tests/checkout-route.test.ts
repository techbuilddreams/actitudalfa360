import { beforeEach, describe, expect, it, vi } from 'vitest';

const run = vi.fn<(...args: unknown[]) => Promise<{ url: string }>>(async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }));
vi.mock('@/infrastructure/container', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  checkoutLimiter: { hit: () => ({ allowed: true, retryAfterSec: 0 }) },
  createCheckout: () => run,
}));
vi.mock('@/config/env', () => ({ env: () => ({ NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com' }) }));

import { POST } from '@/app/api/checkout/route';

const call = (body: unknown) =>
  POST(new Request('https://actitudalfa360.com/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://actitudalfa360.com', 'x-vercel-ip-country': 'US' },
    body: JSON.stringify(body),
  }));
const items = [{ sku: 'AA360-TAZA-15-NEGRA', quantity: 1 }];

beforeEach(() => run.mockClear());

describe('POST /api/checkout — atribución', () => {
  it('pasa la atribución al caso de uso (que la valida)', async () => {
    const attribution = { gaClientId: '123.456', utm: { source: 'tiktok' } };
    expect((await call({ items, attribution })).status).toBe(200);
    expect(run).toHaveBeenCalledWith(items, attribution);
  });
  it('una atribución basura no impide pagar', async () => {
    expect((await call({ items, attribution: 'basura' })).status).toBe(200);
    expect(run).toHaveBeenCalledWith(items, 'basura');
  });
  it('sin atribución: igual que antes', async () => {
    expect((await call({ items })).status).toBe(200);
    expect(run).toHaveBeenCalledWith(items, undefined);
  });
});

describe('POST /api/checkout — el SERVIDOR comprueba el permiso (Rompedor P1)', () => {
  const callH = (headers: Record<string, string>) =>
    POST(new Request('https://actitudalfa360.com/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://actitudalfa360.com', ...headers },
      body: JSON.stringify({ items, attribution: { gaClientId: '123.456' } }),
    }));
  it('permiso retirado en otra pestaña (cookie denied) ⇒ la atribución se tira', async () => {
    expect((await callH({ 'x-vercel-ip-country': 'FR', cookie: 'aa_consent=v1.denied' })).status).toBe(200);
    expect(run).toHaveBeenCalledWith(items, undefined);
  });
  it('EE. UU. retirado también (denied vale en cualquier región)', async () => {
    await callH({ 'x-vercel-ip-country': 'US', cookie: 'aa_consent=v1.denied' });
    expect(run).toHaveBeenCalledWith(items, undefined);
  });
  it('GPC ⇒ se tira', async () => {
    await callH({ 'x-vercel-ip-country': 'US', 'sec-gpc': '1' });
    expect(run).toHaveBeenCalledWith(items, undefined);
  });
  it('UE sin elegir aún ⇒ se tira', async () => {
    await callH({ 'x-vercel-ip-country': 'DE' });
    expect(run).toHaveBeenCalledWith(items, undefined);
  });
  it('UE aceptado ⇒ pasa', async () => {
    await callH({ 'x-vercel-ip-country': 'DE', cookie: 'otra=1; aa_consent=v1.granted' });
    expect(run).toHaveBeenCalledWith(items, { gaClientId: '123.456' });
  });
});
