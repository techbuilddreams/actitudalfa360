import { describe, expect, it } from 'vitest';
import { deploymentProblems, type ServerEnv } from '@/config/env';

const base: ServerEnv = {
  NODE_ENV: 'production', APP_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://actitudalfa360.com',
  STRIPE_SECRET_KEY: 'rk_live_x', STRIPE_WEBHOOK_SECRET: 'whsec_x', STRIPE_AUTOMATIC_TAX: false,
  DATABASE_URL: 'mysql://u:p@localhost:3306/db', DB_POOL_SIZE: 5,
  PRINTIFY_AUTO_ORDER: false, PRINTIFY_API_TOKEN: undefined, PRINTIFY_SHOP_ID: undefined,
  SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: 465, SMTP_USER: undefined, SMTP_PASSWORD: undefined,
  MAIL_FROM: 'x', ORDER_NOTIFY_EMAIL: undefined, SHIPPING_FLAT_CENTS: 899, TRUSTED_PROXY_HOPS: 1,
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
  it('local no exige nada', () => expect(deploymentProblems({ ...base, APP_ENV: 'local', DATABASE_URL: undefined })).toEqual([]));
});
