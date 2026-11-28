import 'server-only';
import { z } from 'zod';
import { checkDeployment, parseEnv, schema, type ServerEnv } from './deploy-rules';

export { checkDeployment, deploymentProblems, parseEnv, type ServerEnv } from './deploy-rules';

/**
 * SEGUNDA línea de defensa, al arrancar (instrumentation). La primera es la build: `scripts/check-deploy.ts` en
 * `vercel-build` corre la MISMA `checkDeployment` y un deploy con problemas ni se publica. Aquí solo se llega si el
 * entorno cambió sin rebuild; Next cachea el fallo de register(), así que esto deja el servidor en 500, no caído.
 */
export function assertDeployable(raw: Record<string, string | undefined> = process.env): void {
  const problems = checkDeployment(raw);
  if (problems.length) throw new Error(`Configuración inválida: ${problems.join('; ')}`);
}


let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (!cached) {
    const parsed = parseEnv(process.env);
    if (!parsed.success) {
      // Nunca imprimimos valores, solo qué variable falló.
      const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
      throw new Error(`Variables de entorno inválidas: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function requireEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = env()[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Falta la variable de entorno ${String(key)}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

export const isProduction = () => env().APP_ENV === 'production';

const publicSchema = schema.pick({ SHIPPING_FLAT_CENTS: true, STRIPE_AUTOMATIC_TAX: true });
export type PublicEnv = z.infer<typeof publicSchema>;

/**
 * Solo lo que se muestra al público (envío fijo, si se suma impuesto), con el mismo esquema.
 * Lo usan el copy, las fichas y el checkout: un secreto mal configurado no tumba páginas que no cobran.
 */
export function publicEnv(raw: Record<string, string | undefined> = process.env): PublicEnv {
  const r = publicSchema.safeParse(raw);
  if (!r.success) throw new Error(`Variables de entorno inválidas: ${r.error.issues.map((x) => x.path.join('.')).join(', ')}`);
  return r.data;
}
