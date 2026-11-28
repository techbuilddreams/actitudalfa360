/**
 * Compuerta de despliegue como PASO DE BUILD (primero en `vercel-build`, antes de migrar y de `next build`).
 * Si la configuración del entorno tiene problemas, sale ≠ 0: la build falla y Vercel deja vivo el deploy anterior.
 * (Lanzar solo en instrumentation no basta: Next cachea ese fallo, el deploy dice Ready y responde 500 en todo.)
 *
 * Corre con `node --experimental-strip-types`: misma regla que el servidor (`checkDeployment`), sin tsx ni `@/`.
 * Nunca imprime valores: los problemas solo nombran variables.
 */
import { checkDeployment } from '../src/config/deploy-rules.ts';

const log = (level: 'info' | 'error', msg: string, meta: Record<string, unknown> = {}) => {
  const line = JSON.stringify({ level, msg, ...meta, ts: new Date().toISOString() });
  (level === 'error' ? console.error : console.log)(line);
};

const problems = checkDeployment(process.env);
const where = { appEnv: process.env.APP_ENV ?? null, vercelEnv: process.env.VERCEL_ENV ?? null };
if (problems.length) {
  log('error', 'deploy_check_failed', { ...where, problems });
  process.exitCode = 1;
} else {
  log('info', 'deploy_check_ok', where);
}
