import { describe, expect, it } from 'vitest';
import { deploymentProblems, parseEnv, type ServerEnv } from '@/config/env';

const base: ServerEnv = {
  NODE_ENV: 'production', APP_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com',
  STRIPE_SECRET_KEY: 'rk_live_x', STRIPE_WEBHOOK_SECRET: 'whsec_x', STRIPE_AUTOMATIC_TAX: false,
  DATABASE_URL: 'postgresql://u:p@pooler.supabase.com:6543/postgres', DATABASE_MIGRATION_URL: undefined, DB_POOL_SIZE: 5,
  PRINTIFY_AUTO_ORDER: false, PRINTIFY_API_TOKEN: undefined, PRINTIFY_SHOP_ID: undefined,
  SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: 465, SMTP_USER: undefined, SMTP_PASSWORD: undefined,
  MAIL_FROM: 'x', ORDER_NOTIFY_EMAIL: undefined, SHIPPING_FLAT_CENTS: 899, VERCEL_ENV: undefined,
};

describe('configuración de despliegue', () => {
  it('producción completa: sin problemas', () => expect(deploymentProblems(base)).toEqual([]));
  it('producción sin base de datos: falla (nunca pedidos en memoria)', () =>
    expect(deploymentProblems({ ...base, DATABASE_URL: undefined }).join()).toContain('DATABASE_URL'));
  it('producción con llave de prueba: falla', () =>
    expect(deploymentProblems({ ...base, STRIPE_SECRET_KEY: 'rk_test_x' }).join()).toContain('live'));
  it('staging con llave live: falla', () =>
    expect(deploymentProblems({ ...base, APP_ENV: 'staging' }).join()).toContain('Staging'));
  it('Printify automático sin token: falla al arrancar, no al cobrar', () =>
    expect(deploymentProblems({ ...base, PRINTIFY_AUTO_ORDER: true }).join()).toContain('PRINTIFY'));
  it('preview de Vercel con APP_ENV=production: falla (un preview nunca cobra de verdad)', () =>
    expect(deploymentProblems({ ...base, VERCEL_ENV: 'preview' }).join()).toContain('VERCEL_ENV'));
  it('producción de Vercel con APP_ENV=staging: falla (variables cruzadas de entorno)', () =>
    expect(deploymentProblems({ ...base, APP_ENV: 'staging', STRIPE_SECRET_KEY: 'rk_test_x', VERCEL_ENV: 'production' }).join()).toContain('VERCEL_ENV'));
  it('entornos de Vercel bien emparejados: sin problemas', () => {
    expect(deploymentProblems({ ...base, VERCEL_ENV: 'production' })).toEqual([]);
    expect(deploymentProblems({ ...base, APP_ENV: 'staging', STRIPE_SECRET_KEY: 'rk_test_x', VERCEL_ENV: 'preview' })).toEqual([]);
  });
  it('local no exige nada', () => expect(deploymentProblems({ ...base, APP_ENV: 'local', DATABASE_URL: undefined })).toEqual([]));
});

describe('URLs de base de datos (Postgres)', () => {
  const ok = (raw: Record<string, string>) => parseEnv(raw).success;
  it('acepta postgres:// y postgresql://', () => {
    expect(ok({ DATABASE_URL: 'postgres://u:p@h:6543/db' })).toBe(true);
    expect(ok({ DATABASE_URL: 'postgresql://u:p@h:6543/db' })).toBe(true);
  });
  it('rechaza mysql:// (la base vieja)', () => expect(ok({ DATABASE_URL: 'mysql://u:p@h:3306/db' })).toBe(false));
  it('DATABASE_MIGRATION_URL opcional, y si viene debe ser Postgres', () => {
    expect(ok({})).toBe(true);
    expect(ok({ DATABASE_MIGRATION_URL: 'postgresql://u:p@h:5432/db' })).toBe(true);
    expect(ok({ DATABASE_MIGRATION_URL: 'mysql://u:p@h:3306/db' })).toBe(false);
  });
  it('una URL malformada (# sin codificar) se rechaza sin filtrar la contraseña', () => {
    const r = parseEnv({ DATABASE_URL: 'postgres://u:SEC#RETO@h:5432/d' });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error)).not.toContain('SEC');
  });
});
