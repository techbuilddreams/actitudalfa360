import { afterEach, describe, expect, it, vi } from 'vitest';
import { site } from '@/config/site';
import { usd } from '@/domain/money';
import { catalog } from '@/infrastructure/container';
import { copy } from '@/content';
import { shippingNote } from '@/lib/price-notes';
import { policyPhrases } from '@/lib/policy-facts';
import { organizationLd } from '@/lib/structured-data';
import { llmsTxt } from '@/lib/llms-txt';
import type { Product } from '@/domain/product';

const txt = llmsTxt(catalog.all(), 899);

describe('llmsTxt', () => {
  it('cabecera llms.txt: H1 con el nombre y cita con la descripción', () => {
    expect(txt.startsWith(`# ${site.name}\n`)).toBe(true);
    expect(txt).toContain('\n> ');
    expect(txt).toContain(site.slogan);
  });

  it('la LLC sale de site.legalState; nunca «Nueva York» (ni en llms.txt ni en el JSON-LD de Organization)', () => {
    expect(txt).toContain(`${site.legalName}, ${site.legalState} (EE. UU.)`);
    expect(txt).not.toMatch(/Nueva York|New York/);
    const d = (organizationLd() as { description: string }).description;
    expect(d).not.toMatch(/Nueva York|New York/);
    expect(d).toContain(`constituida en ${site.legalState}`);
    expect(copy.organization.description).toContain(site.legalState);
  });

  it('cada producto: enlace absoluto, precio y descripción corta del catálogo', () => {
    for (const p of catalog.all()) {
      expect(txt).toContain(`[${p.h1.split(' — ')[0]}](${site.url}/productos/${p.slug})`);
    }
    expect(txt).toContain('$24.99');
    expect(txt).toContain('$34.99');
  });

  it('envío: la misma nota que la ficha (shippingNote) y los plazos exactos de /politicas', () => {
    expect(txt).toContain(shippingNote(usd(899), false));
    expect(txt).toContain('envío fijo $8.99');
    expect(txt).toContain('producción 2–5 días hábiles');
    expect(txt).toContain('entrega 3–7 días hábiles');
    expect(txt).not.toMatch(/semanas/);
    expect(llmsTxt(catalog.all(), 0)).toContain(shippingNote(usd(0), false));
    expect(llmsTxt(catalog.all(), 0)).toContain('envío gratis');
  });

  it('país: solo Estados Unidos, con la frase exacta de /politicas', () => {
    expect(txt).toContain('solo dentro de Estados Unidos');
  });

  it('devoluciones: la redacción exacta de /politicas, sin «aceptamos devoluciones» a secas', () => {
    expect(txt).toContain('no aceptamos devoluciones por cambio de opinión');
    expect(txt).toContain('dañado, defectuoso o equivocado');
    expect(txt).toContain(`dentro de los ${site.returns.days} días siguientes a la entrega`);
    expect(txt).not.toMatch(/(?<!no )aceptamos devoluciones/);
    expect(txt).toContain(`${site.url}/politicas`);
  });

  it('comparte fuente con /politicas: policyPhrases', () => {
    const f = policyPhrases();
    expect(f.onlyUs).toBe('solo dentro de Estados Unidos');
    expect(f.handling).toBe('2–5 días hábiles');
    expect(f.transit).toBe('3–7 días hábiles');
    expect(f.noReturns).toBe('no aceptamos devoluciones por cambio de opinión');
    expect(f.defectKinds).toBe('dañado, defectuoso o equivocado');
    expect(f.defectWindow).toBe(`dentro de los ${site.returns.days} días siguientes a la entrega`);
  });

  it('escapa corchetes en el texto del enlace Markdown', () => {
    const p = { ...catalog.all()[0], h1: 'Taza [Alfa] ]x[ — frase' } as Product;
    expect(llmsTxt([p], 899)).toContain('[Taza \\[Alfa\\] \\]x\\[](');
  });
});

describe('proxy: archivos de máquina fuera de la CSP/nonce', () => {
  it('llms.txt y merchant-feed.xml no pasan por el proxy', async () => {
    const { config } = await import('@/proxy');
    const source = (config.matcher[0] as { source: string }).source;
    const re = new RegExp(`^${source}$`);
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
