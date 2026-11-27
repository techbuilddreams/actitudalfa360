#!/usr/bin/env node
/**
 * Aplica las migraciones de `drizzle/` como PASO DE BUILD (`npm run vercel-build`), no al arrancar:
 * en serverless no hay un arranque único y cada instancia fría migraría.
 *
 * - URL: DATABASE_MIGRATION_URL = pooler de Supabase en MODO SESIÓN (puerto 5432). El lock de abajo es de
 *   sesión y no sobrevive al pooler en modo transacción (6543, rechazado); la conexión directa es solo IPv6.
 * - Concurrencia: varias builds (preview + producción) pueden migrar la misma base a la vez. El migrador de
 *   Drizzle no toma lock, así que lo tomamos aquí: pg_advisory_lock en UNA conexión (max: 1).
 * - En Vercel solo migran `main` y `develop`: una rama de feature no cambia el esquema compartido
 *   (sale 0 y lo dice; /api/health reporta si el esquema no cuadra). Sin rama (deploy por CLI) o sin URL: falla.
 * - Fuera de Vercel sin URL: no hace nada.
 * - Nunca imprime la URL (lleva la contraseña) ni datos de la base: todo error pasa por safeError.
 *
 * JS plano a propósito: corre con `node` en la build, sin tsx ni el alias `@/`.
 */
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { safeError } from '../src/lib/safe-error.mjs';

// Clave fija del lock (bigint arbitrario, propio de este proyecto).
const LOCK_KEY = 360_360_001;
const MIGRATING_BRANCHES = ['main', 'develop'];
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const log = (level, msg, meta = {}) => {
  const line = JSON.stringify({ level, msg, ...meta, ts: new Date().toISOString() });
  (level === 'error' ? console.error : console.log)(line);
};
const fail = (reason) => { log('error', 'migrations_failed', { reason }); return 1; };

/** Valida sin propagar nunca el valor (un TypeError de `new URL` trae el input completo, contraseña incluida). */
function checkUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return 'DATABASE_MIGRATION_URL no es una URL válida (¿un carácter como # sin codificar en la contraseña?)';
  }
  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') return 'DATABASE_MIGRATION_URL debe empezar por postgres:// o postgresql://';
  if (u.port === '6543') return 'DATABASE_MIGRATION_URL apunta al pooler de TRANSACCIÓN (6543): usa el de SESIÓN (5432); el lock no funciona en el 6543';
  return null;
}

async function main() {
  const vercel = process.env.VERCEL_ENV;
  if (vercel) {
    const ref = process.env.VERCEL_GIT_COMMIT_REF;
    if (!ref) return fail(`VERCEL_GIT_COMMIT_REF vacía (VERCEL_ENV=${vercel}): no se sabe la rama, no se despliega a ciegas`);
    if (!MIGRATING_BRANCHES.includes(ref)) {
      log('info', 'migrations_skipped', { reason: `rama ${ref}: solo migran ${MIGRATING_BRANCHES.join('/')}` });
      return 0;
    }
  }
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) {
    if (vercel) return fail(`DATABASE_MIGRATION_URL es obligatoria en Vercel (VERCEL_ENV=${vercel})`);
    log('info', 'migrations_skipped', { reason: 'sin DATABASE_MIGRATION_URL (fuera de Vercel)' });
    return 0;
  }
  const bad = checkUrl(url);
  if (bad) return fail(bad);

  let sql;
  try {
    // max: 1 ⇒ el lock, el migrador y el unlock van por la MISMA conexión.
    sql = postgres(url, { max: 1, prepare: false, idle_timeout: 0, connect_timeout: 15, onnotice: () => {} });
    // Esperar el lock hasta 120 s (otra build migrando); si otra quedó colgada, mejor una build fallida y visible.
    await sql`SET lock_timeout = '120s'`;
    await sql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    try {
      // Ya con el lock: la DDL no debe esperar más de 5 s por la tabla, o bloquearía a los webhooks detrás de ella.
      await sql`SET lock_timeout = '5s'`;
      const started = Date.now();
      await migrate(drizzle(sql), { migrationsFolder });
      log('info', 'migrations_ok', { ms: Date.now() - started });
    } finally {
      await sql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    }
    return 0;
  } catch (err) {
    log('error', 'migrations_failed', safeError(err));
    return 1;
  } finally {
    await sql?.end({ timeout: 5 }).catch(() => {});
  }
}

process.exitCode = await main();
