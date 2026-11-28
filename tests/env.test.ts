import { describe, expect, it } from 'vitest';
import { deploymentProblems, parseEnv, publicEnv, type ServerEnv } from '@/config/env';

const base: ServerEnv = {
  NODE_ENV: 'production', APP_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com',
  STRIPE_SECRET_KEY: 'rk_live_x', STRIPE_WEBHOOK_SECRET: 'whsec_x', STRIPE_AUTOMATIC_TAX: false,
  DATABASE_URL: 'postgresql://u:p@pooler.supabase.com:6543/postgres', DATABASE_MIGRATION_URL: undefined, DB_POOL_SIZE: 5,
  PRINTIFY_AUTO_ORDER: false, PRINTIFY_API_TOKEN: undefined, PRINTIFY_SHOP_ID: undefined,
  SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: 465, SMTP_USER: undefined, SMTP_PASSWORD: undefined,
  MAIL_FROM: 'x', ORDER_NOTIFY_EMAIL: undefined, SHIPPING_FLAT_CENTS: 899, VERCEL_ENV: undefined, RETO_SIGNUP: 'log',
};

describe('configuración de despliegue', () => {
  it('producción con el alta del reto en modo log: falla (F3 pendiente)', () =>
    expect(deploymentProblems({ ...base, RETO_SIGNUP: 'log' }).join()).toContain('El alta del reto solo registra en el log: falta F3'));
  it('staging con el alta del reto en modo log: sigue funcionando', () =>
    expect(deploymentProblems({ ...base, APP_ENV: 'staging', STRIPE_SECRET_KEY: 'rk_test_x', RETO_SIGNUP: 'log' })).toEqual([]));
  it('RETO_SIGNUP por defecto es log', () => {
    const r = parseEnv({});
    expect(r.success && r.data.RETO_SIGNUP).toBe('log');
  });
  // Hasta F3, NINGUNA configuración de producción pasa: el único problema que queda es el del alta del reto.
  it('producción completa: el único problema es F3 (el alta del reto)', () => {
    const p = deploymentProblems(base);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('falta F3');
  });
  it('RETO_SIGNUP=resend no existe hasta F3: se rechaza al validar', () =>
    expect(parseEnv({ RETO_SIGNUP: 'resend' }).success).toBe(false));
  it('producción sin base de datos: falla (nunca pedidos en memoria)', () =>
    expect(deploymentProblems({ ...base, DATABASE_URL: undefined }).join()).toContain('DATABASE_URL'));
  it('producción con llave de prueba: falla', () =>
    expect(deploymentProblems({ ...base, STRIPE_SECRET_KEY: 'rk_test_x' }).join()).toContain('live'));
  it('staging con llave live: falla', () =>
    expect(deploymentProblems({ ...base, APP_ENV: 'staging' }).join()).toContain('live solo vale con APP_ENV=production (hay staging)'));
  it('Printify automático sin token: falla al arrancar, no al cobrar', () =>
    expect(deploymentProblems({ ...base, PRINTIFY_AUTO_ORDER: true }).join()).toContain('PRINTIFY'));
  it('preview de Vercel con APP_ENV=production: falla (un preview nunca cobra de verdad)', () =>
    expect(deploymentProblems({ ...base, VERCEL_ENV: 'preview' }).join()).toContain('VERCEL_ENV'));
  it('producción de Vercel con APP_ENV=staging: falla (variables cruzadas de entorno)', () =>
    expect(deploymentProblems({ ...base, APP_ENV: 'staging', STRIPE_SECRET_KEY: 'rk_test_x', VERCEL_ENV: 'production' }).join()).toContain('VERCEL_ENV'));
  it('entornos de Vercel bien emparejados: sin problemas', () => {
    expect(deploymentProblems({ ...base, VERCEL_ENV: 'production' }).filter((x) => !x.includes('falta F3'))).toEqual([]);
    expect(deploymentProblems({ ...base, APP_ENV: 'staging', STRIPE_SECRET_KEY: 'rk_test_x', VERCEL_ENV: 'preview' })).toEqual([]);
  });
  it('local no exige nada (con llave de prueba)', () => expect(deploymentProblems({ ...base, APP_ENV: 'local', STRIPE_SECRET_KEY: 'rk_test_x', DATABASE_URL: undefined })).toEqual([]));
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
  it('una contraseña con # que parece puerto se rechaza (postgres://postgres:5999#Zx@host)', () => {
    expect(parseEnv({ DATABASE_URL: 'postgres://postgres:5999#Zx@host/db' }).success).toBe(false);
    expect(parseEnv({ DATABASE_URL: 'postgresql://u:p@h:6543/db?sslmode=require' }).success).toBe(true);
  });
  it('una URL malformada (# sin codificar) se rechaza sin filtrar la contraseña', () => {
    const r = parseEnv({ DATABASE_URL: 'postgres://u:SEC#RETO@h:5432/d' });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error)).not.toContain('SEC');
  });
});

describe('SHIPPING_FLAT_CENTS', () => {
  it.each(['', ' ', '0x10', '1e3', '8.99', '-1', '99999999999'])('rechaza %j (nunca envío gratis o absurdo en silencio)', (v) => {
    expect(() => publicEnv({ SHIPPING_FLAT_CENTS: v })).toThrow(/SHIPPING_FLAT_CENTS/);
    expect(parseEnv({ SHIPPING_FLAT_CENTS: v }).success).toBe(false);
  });
  it('acepta centavos enteros y usa 899 si falta', () => {
    expect(publicEnv({ SHIPPING_FLAT_CENTS: '1099' }).SHIPPING_FLAT_CENTS).toBe(1099);
    expect(publicEnv({ SHIPPING_FLAT_CENTS: '0' }).SHIPPING_FLAT_CENTS).toBe(0);
    expect(publicEnv({}).SHIPPING_FLAT_CENTS).toBe(899);
  });
});
