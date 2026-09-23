/**
 * Se ejecuta UNA vez al arrancar el servidor, antes de atender peticiones.
 * 1) Valida la configuración: si falta algo crítico, el arranque falla (visible en el deploy) en vez de perder pedidos.
 * 2) Aplica las migraciones: funciona en cualquier hosting (no depende de `npm start`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const log = (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: 'info', msg, ...meta, ts: new Date().toISOString() }));

  const { assertDeployable } = await import('./config/env');
  assertDeployable(); // lanza ⇒ el servidor no arranca con configuración peligrosa

  const url = process.env.DATABASE_URL;
  if (!url) {
    log('migrations_skipped_no_database_url');
    return;
  }
  const { runMigrations } = await import('./infrastructure/db/migrate');
  try {
    await runMigrations(url, log);
  } catch (err) {
    // No tumbamos el sitio: la tienda sigue mostrando páginas; /api/health lo reporta y el webhook devolverá 500 (Stripe reintenta).
    console.error(JSON.stringify({ level: 'error', msg: 'migrations_failed', reason: err instanceof Error ? err.message : 'unknown' }));
  }
}
