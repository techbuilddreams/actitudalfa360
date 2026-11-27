#!/usr/bin/env node
/**
 * Aplica las migraciones de `drizzle/` como PASO DE BUILD (`npm run vercel-build`), no al arrancar:
 * en serverless no hay un arranque único y cada instancia fría migraría.
 *
 * - URL: DATABASE_MIGRATION_URL = pooler de Supabase en MODO SESIÓN (puerto 5432). El lock de abajo es de
 *   sesión y no sobrevive al pooler en modo transacción (6543); la conexión directa es solo IPv6.
 * - Concurrencia: varias builds (preview + producción) pueden migrar la misma base a la vez. El migrador de
 *   Drizzle no toma lock, así que lo tomamos aquí: pg_advisory_lock en UNA conexión (max: 1).
 * - En Vercel sin URL: falla la build (no desplegar código sin su esquema). Fuera de Vercel: no hace nada.
 * - Nunca imprime la URL (lleva la contraseña).
 *
 * JS plano a propósito: corre con `node` en la build, sin tsx ni el alias `@/`.
 */
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Clave fija del lock (bigint arbitrario, propio de este proyecto).
const LOCK_KEY = 360_360_001;
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const log = (level, msg, meta = {}) => {
  const line = JSON.stringify({ level, msg, ...meta, ts: new Date().toISOString() });
  (level === 'error' ? console.error : console.log)(line);
};

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) {
    if (process.env.VERCEL_ENV) {
      log('error', 'migrations_failed', { reason: `DATABASE_MIGRATION_URL es obligatoria en Vercel (VERCEL_ENV=${process.env.VERCEL_ENV})` });
      return 1;
    }
    log('info', 'migrations_skipped', { reason: 'sin DATABASE_MIGRATION_URL (fuera de Vercel)' });
    return 0;
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    log('error', 'migrations_failed', { reason: 'DATABASE_MIGRATION_URL debe empezar por postgres:// o postgresql://' });
    return 1;
  }

  // max: 1 ⇒ el lock, el migrador y el unlock van por la MISMA conexión. prepare: false por si alguien
  // apunta al pooler de transacción por error (allí fallaría el lock de todos modos, pero no por prepared statements).
  const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 0, connect_timeout: 15, onnotice: () => {} });
  try {
    // No esperar para siempre si otra build quedó colgada con el lock: mejor una build fallida y visible.
    await sql`SET lock_timeout = '120s'`;
    await sql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    try {
      const started = Date.now();
      await migrate(drizzle(sql), { migrationsFolder });
      log('info', 'migrations_ok', { ms: Date.now() - started });
    } finally {
      await sql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    }
    return 0;
  } catch (err) {
    // El mensaje de Postgres no incluye la URL; el de conexión de postgres.js tampoco la contraseña.
    log('error', 'migrations_failed', { reason: err instanceof Error ? err.message : 'unknown', cause: err?.cause?.message, code: err?.cause?.code ?? err?.code });
    return 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

process.exitCode = await main();
