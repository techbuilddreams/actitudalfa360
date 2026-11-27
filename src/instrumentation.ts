/**
 * Se ejecuta UNA vez al arrancar cada instancia del servidor, antes de atender peticiones.
 * Valida la configuración: si falta algo crítico, el arranque falla (visible en el deploy) en vez de perder pedidos.
 *
 * Las migraciones NO van aquí: en serverless cada instancia fría "arranca". Se aplican como paso de build
 * (`npm run vercel-build` → `scripts/migrate.mjs`, con lock).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { assertDeployable } = await import('./config/env');
  assertDeployable(); // lanza ⇒ el servidor no arranca con configuración peligrosa
}
