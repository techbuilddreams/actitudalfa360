// Ronda 4 (sondas del Rompedor r3 + mutante M1): la compuerta compartida por check-deploy y assertDeployable.
import { describe, expect, it } from 'vitest';
import { checkDeployment } from '@/config/deploy-rules';

const prodBase = {
  APP_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com',
  DATABASE_URL: 'postgresql://u:p@h:6543/d', STRIPE_SECRET_KEY: 'sk_live_x', STRIPE_WEBHOOK_SECRET: 'whsec_x',
};
const stgBase = { ...prodBase, APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', VERCEL_ENV: 'preview', STRIPE_SECRET_KEY: 'rk_test_x' };
/** Fuera el aviso de F3 (siempre presente en producción hasta F3): queremos ver el resto. */
const nonReto = (p: string[]) => p.filter((x) => !x.includes('F3'));
const omit = (o: Record<string, string>, k: string) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k));

describe('NEXT_PUBLIC_APP_ENV debe coincidir con APP_ENV al desplegar', () => {
  it('producción con NEXT_PUBLIC_APP_ENV=staging (banner de modo prueba y noindex cobrando live): falla', () =>
    expect(nonReto(checkDeployment({ ...prodBase, NEXT_PUBLIC_APP_ENV: 'staging' })).join()).toMatch(/NEXT_PUBLIC_APP_ENV/));
  it('producción sin NEXT_PUBLIC_APP_ENV: falla', () =>
    expect(nonReto(checkDeployment(omit(prodBase, 'NEXT_PUBLIC_APP_ENV'))).join()).toMatch(/NEXT_PUBLIC_APP_ENV/));
  it('staging sin NEXT_PUBLIC_APP_ENV (preview indexable, sin banner): falla', () =>
    expect(checkDeployment(omit(stgBase, 'NEXT_PUBLIC_APP_ENV')).join()).toMatch(/NEXT_PUBLIC_APP_ENV/));
  it('staging coherente: sin problemas', () => expect(checkDeployment(stgBase)).toEqual([]));
  it('producción coherente: solo queda F3', () => expect(nonReto(checkDeployment(prodBase))).toEqual([]));
  it('local no se ve afectado', () => expect(checkDeployment({ APP_ENV: 'local', NEXT_PUBLIC_APP_ENV: 'staging' })).toEqual([]));
});

describe('VERCEL=1 es una build desplegada', () => {
  it('VERCEL=1 + CI=1 sin APP_ENV ni VERCEL_ENV ni NODE_ENV: falla', () =>
    expect(checkDeployment({ VERCEL: '1', CI: '1' }).join()).toMatch(/APP_ENV es obligatoria/));
  it('VERCEL=1 solo, sin APP_ENV: falla', () => expect(checkDeployment({ VERCEL: '1' }).join()).toMatch(/APP_ENV es obligatoria/));
  it('build local (sin VERCEL), sin APP_ENV: pasa', () => expect(checkDeployment({ CI: '1' })).toEqual([]));
});

describe('mutante M1: VERCEL_ENV=production exige APP_ENV=production', () => {
  it('VERCEL_ENV=production + APP_ENV=staging (coherente en lo demás): falla', () =>
    expect(checkDeployment({ ...stgBase, VERCEL_ENV: 'production' }).join()).toMatch(/VERCEL_ENV=production requiere APP_ENV=production/));
});
