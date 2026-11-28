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
    headers: { 'content-type': 'application/json', origin: 'https://actitudalfa360.com' },
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
