import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

afterEach(() => vi.unstubAllEnvs());
const csp = () => proxy(new NextRequest('https://actitudalfa360.com/')).headers.get('content-security-policy') ?? '';

describe('proxy: la CSP sigue a la configuración de medición (cableado, no solo buildCsp)', () => {
  it('sin ID de GA4: ni un dominio de Google', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
    expect(csp()).not.toMatch(/google/);
  });
  it('con ID: Google en connect-src', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-AB12CD34EF');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    expect(csp()).toMatch(/connect-src [^;]*google-analytics\.com/);
  });
  it('staging con ID: cerrado igual', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-AB12CD34EF');
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'staging');
    expect(csp()).not.toMatch(/google/);
  });
});
