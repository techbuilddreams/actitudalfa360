import { describe, expect, it } from 'vitest';
import { runMigrate } from './support/run-migrate';

describe('scripts/migrate.mjs (sin base de datos)', () => {
  it('en Vercel sin DATABASE_MIGRATION_URL la build FALLA (no despliega código sin su esquema)', async () => {
    const r = await runMigrate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'develop' });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain('DATABASE_MIGRATION_URL');
  });

  it('fuera de Vercel sin URL no hace nada y lo dice', async () => {
    const r = await runMigrate({});
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('migrations_skipped');
  });

  it('rechaza una URL que no es Postgres, sin imprimirla (lleva la contraseña)', async () => {
    const r = await runMigrate({ DATABASE_MIGRATION_URL: 'mysql://u:SECRETO123@localhost:3306/db' });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain('postgres');
    expect(r.stdout + r.stderr).not.toContain('SECRETO123');
  });

  it('una URL con # sin codificar no filtra la contraseña', async () => {
    const r = await runMigrate({ DATABASE_MIGRATION_URL: 'postgres://u:SEC#RETO@h:5432/d' });
    expect(r.code).not.toBe(0);
    expect(r.stdout + r.stderr).not.toContain('SEC');
  });

  it('rechaza el pooler de transacción (6543): el lock de sesión no funciona ahí', async () => {
    const r = await runMigrate({ DATABASE_MIGRATION_URL: 'postgresql://u:p@aws-0-x.pooler.supabase.com:6543/postgres' });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain('6543');
  });

  it('en Vercel, una rama que no es main/develop NO migra (sale 0 y lo dice)', async () => {
    const r = await runMigrate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature/x', DATABASE_MIGRATION_URL: 'postgresql://u:p@127.0.0.1:1/d' });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('migrations_skipped');
    expect(r.stdout).toContain('feature/x');
  });

  it('en Vercel sin VERCEL_GIT_COMMIT_REF (deploy desde CLI) falla cerrado', async () => {
    const r = await runMigrate({ VERCEL_ENV: 'production', DATABASE_MIGRATION_URL: 'postgresql://u:p@127.0.0.1:1/d' });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain('VERCEL_GIT_COMMIT_REF');
  });
});
