// La compuerta de despliegue falla la BUILD (vercel-build), no el servidor en marcha.
// Nacido de las sondas del Rompedor r2 (local + live) y del P0 «Ready pero 500 en todo».
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assertDeployable, deploymentProblems, parseEnv } from '@/config/env';

const root = fileURLToPath(new URL('..', import.meta.url));
const script = 'scripts/check-deploy.ts';
/** Corre el paso de build tal cual lo corre vercel-build, con un entorno cerrado (nada heredado salvo PATH). */
function runCheck(env: Record<string, string>) {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', script], {
    cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH ?? '', ...env } as unknown as NodeJS.ProcessEnv, timeout: 20_000,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const without = (o: Record<string, string>, ...keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

const staging = {
  APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', VERCEL_ENV: 'preview', NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360-git-develop.vercel.app',
  DATABASE_URL: 'postgresql://u:p@pooler.supabase.com:6543/postgres', STRIPE_SECRET_KEY: 'rk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x',
};
const prod = { ...staging, APP_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com', STRIPE_SECRET_KEY: 'sk_live_abc' };

describe('vercel-build: la compuerta va ANTES de migrar y de next build', () => {
  it('el script de build empieza por el chequeo', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
    const steps = pkg.scripts['vercel-build']!.split('&&').map((s) => s.trim());
    expect(steps[0]).toBe(`node --experimental-strip-types --no-warnings ${script}`);
    expect(steps.slice(1)).toEqual(['node scripts/migrate.mjs', 'next build']);
  });
});

describe('paso de build check-deploy (de punta a punta, proceso real)', () => {
  it('producción con problemas (F3 pendiente): sale distinto de 0 y dice por qué', () => {
    const r = runCheck(prod);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('falta F3');
    expect(r.out).not.toContain('sk_live_abc');
  });
  it('staging sin llaves de Stripe: falla la build (antes: Ready y 500 en todo)', () => {
    const r = runCheck(without(staging, 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'));
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('STRIPE_SECRET_KEY es obligatoria en staging');
  });
  it('en Vercel sin APP_ENV: falla', () => {
    const r = runCheck(without(staging, 'APP_ENV'));
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('APP_ENV');
  });
  it('variable con formato inválido: falla sin imprimir el valor', () => {
    const r = runCheck({ ...staging, DATABASE_URL: 'postgres://u:secretazo#x@h/db' });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('DATABASE_URL');
    expect(r.out).not.toContain('secretazo');
  });
  it('staging limpio: sale 0', () => {
    const r = runCheck(staging);
    expect(r.out).toContain('deploy_check_ok');
    expect(r.code).toBe(0);
  });
});

describe('segunda línea: el arranque sigue lanzando con la misma regla', () => {
  const noStripe = without(staging, 'STRIPE_SECRET_KEY');
  it('assertDeployable lanza con staging sin Stripe', () =>
    expect(() => assertDeployable({ ...noStripe, NODE_ENV: 'production' })).toThrow(/STRIPE_SECRET_KEY/));
  it('assertDeployable no lanza con staging limpio', () =>
    expect(() => assertDeployable({ ...staging, NODE_ENV: 'production' })).not.toThrow());
});

describe('una llave live fuera de APP_ENV=production es un problema, local incluido', () => {
  const live = { NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com', DATABASE_URL: 'postgres://u:p@h:6543/db', STRIPE_SECRET_KEY: 'sk_live_abc', STRIPE_WEBHOOK_SECRET: 'whsec_abc' };
  const probs = (raw: Record<string, string>) => {
    const p = parseEnv(raw);
    if (!p.success) throw new Error('parse');
    return deploymentProblems(p.data);
  };
  it('APP_ENV=local + NODE_ENV=production + sk_live_', () => expect(probs({ ...live, APP_ENV: 'local' }).join()).toMatch(/live/));
  it('APP_ENV=local + VERCEL_ENV=preview + sk_live_', () => expect(probs({ ...live, APP_ENV: 'local', VERCEL_ENV: 'preview' }).join()).toMatch(/live/));
  it('APP_ENV=local + rk_live_ en desarrollo', () => expect(probs({ APP_ENV: 'local', STRIPE_SECRET_KEY: 'rk_live_x' }).join()).toMatch(/live/));
  it('APP_ENV=local con llave de prueba: sin problemas', () => expect(probs({ APP_ENV: 'local', STRIPE_SECRET_KEY: 'sk_test_x' })).toEqual([]));
});
