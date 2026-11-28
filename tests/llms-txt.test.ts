import { afterEach, describe, expect, it, vi } from 'vitest';
import { site } from '@/config/site';
import { catalog } from '@/infrastructure/container';
import { organizationLd } from '@/lib/structured-data';
import { llmsTxt } from '@/lib/llms-txt';

const txt = llmsTxt(catalog.all(), 899);

describe('llmsTxt', () => {
  it('cabecera llms.txt: H1 con el nombre y cita con la descripción', () => {
    expect(txt.startsWith(`# ${site.name}\n`)).toBe(true);
    expect(txt).toContain('\n> ');
    expect(txt).toContain(site.slogan);
  });

  it('la LLC es de Florida; nunca «Nueva York» (ni en llms.txt ni en el JSON-LD de Organization)', () => {
    expect(txt).toContain(`${site.legalName}, Florida`);
    expect(txt).not.toMatch(/Nueva York|New York/);
    expect((organizationLd() as { description: string }).description).not.toMatch(/Nueva York|New York/);
    expect((organizationLd() as { description: string }).description).toContain('Florida');
  });

  it('cada producto: enlace absoluto, precio y descripción corta del catálogo', () => {
    for (const p of catalog.all()) {
      expect(txt).toContain(`[${p.h1.split(' — ')[0]}](${site.url}/productos/${p.slug})`);
    }
    expect(txt).toContain('$24.99');
    expect(txt).toContain('$34.99');
  });

  it('envío y plazos salen de las constantes, no de texto fijo', () => {
    expect(txt).toContain('$8.99');
    expect(txt).toContain('2–5 días hábiles');
    expect(txt).toContain('3–7');
    expect(llmsTxt(catalog.all(), 0)).toContain('envío gratis');
  });

  it('devoluciones: hecho a pedido, sin cambio de opinión; reemplazo o reembolso por daño dentro del plazo', () => {
    expect(txt).toMatch(/a pedido/);
    expect(txt).toContain(`${site.returns.days} días`);
    expect(txt).toContain(`${site.url}/politicas`);
  });
});

describe('proxy: archivos de máquina fuera de la CSP/nonce', () => {
  it('llms.txt y merchant-feed.xml no pasan por el proxy', async () => {
    const { config } = await import('@/proxy');
    const source = (config.matcher[0] as { source: string }).source;
    const re = new RegExp(`^${source.replace(/^\//, '/')}$`);
    expect(re.test('/merchant-feed.xml')).toBe(false);
    expect(re.test('/llms.txt')).toBe(false);
    expect(re.test('/politicas')).toBe(true);
  });
});

describe('GET /llms.txt', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('text/plain UTF-8', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    vi.resetModules();
    const { GET } = await import('@/app/llms.txt/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toContain('# Actitud Alfa 360');
  });

  it('staging: 404 (no indexable)', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'staging');
    vi.resetModules();
    const { GET } = await import('@/app/llms.txt/route');
    expect((await GET()).status).toBe(404);
  });
});
