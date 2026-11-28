/**
 * Se ejecuta UNA vez al arrancar cada instancia del servidor, antes de atender peticiones.
 * SEGUNDA línea de la compuerta de configuración. La primera es la build (`scripts/check-deploy.ts`, primer paso de
 * `vercel-build`): con problemas, el deploy ni se publica. Si aun así llega aquí (entorno cambiado sin rebuild),
 * Next cachea el fallo y el servidor responde 500 en toda ruta en vez de cobrar con una configuración peligrosa.
 *
 * Las migraciones NO van aquí: en serverless cada instancia fría "arranca". Se aplican como paso de build
 * (`npm run vercel-build` → `scripts/migrate.mjs`, con lock).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { assertDeployable } = await import('./config/env');
  assertDeployable(); // lanza ⇒ 500 en todo (incluido el webhook), nunca un cobro con configuración peligrosa
}
