import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const req = { headers: new Headers(), cookie: undefined as string | undefined };
vi.mock('next/headers', () => ({
  headers: async () => req.headers,
  cookies: async () => ({ get: (n: string) => (n === 'aa_consent' && req.cookie ? { name: n, value: req.cookie } : undefined) }),
}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/font/local', () => ({ default: () => ({ variable: 'f' }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const { default: RootLayout } = await import('@/app/layout');
const html = async (country: string, cookie?: string) => {
  req.headers = new Headers({ 'x-vercel-ip-country': country });
  req.cookie = cookie;
  return renderToStaticMarkup(await RootLayout({ children: null }));
};
const BANNER = 'aria-label="Medición del sitio"';
const PREFS = 'Preferencias de cookies';

afterEach(() => vi.unstubAllEnvs());

describe('layout: el gestor de consentimiento está enganchado', () => {
  it('UE sin elección, con ID: banner y preferencias en la página', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-AB12CD34EF');
    const h = await html('DE');
    expect(h).toContain(BANNER);
    expect(h).toContain(PREFS);
  });
  it('UE que ya rechazó: el layout LEE la cookie y no vuelve a preguntar', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-AB12CD34EF');
    const h = await html('DE', 'v1.denied');
    expect(h).not.toContain(BANNER);
    expect(h).toContain(PREFS);
  });
  it('sin ID: nada de consentimiento', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
    const h = await html('DE');
    expect(h).not.toContain(BANNER);
    expect(h).not.toContain(PREFS);
  });
});
