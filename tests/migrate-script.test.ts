import { describe, expect, it } from 'vitest';
import { runMigrate } from './support/run-migrate';

describe('scripts/migrate.mjs (sin base de datos)', () => {
  it('en Vercel sin DATABASE_MIGRATION_URL la build FALLA (no despliega código sin su esquema)', async () => {
    const r = await runMigrate({ VERCEL_ENV: 'preview' });
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
});
