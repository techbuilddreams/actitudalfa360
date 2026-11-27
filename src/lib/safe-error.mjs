// @ts-check
/**
 * Convierte cualquier error en algo seguro para un log: SIN datos del cliente ni credenciales.
 *
 * - Error de Postgres (o envuelto por Drizzle): solo `code` (SQLSTATE) y el `message` de Postgres.
 *   Nunca `detail` (trae la fila: correo, dirección) ni el mensaje de Drizzle (trae la consulta y TODOS los
 *   parámetros).
 * - "Failed query" sin causa de Postgres: no se registra la consulta.
 * - Cualquier otro: su mensaje, truncado y con las URLs tachadas (pueden llevar usuario:contraseña).
 *
 * JS plano (.mjs) para que lo usen tanto la app como `scripts/migrate.mjs` (que corre con node, sin build).
 */
const MAX = 300;
const URL_RE = /[a-z][a-z0-9+.-]*:\/\/\S+/gi;

/** @param {unknown} e */
const isPostgresError = (e) =>
  typeof e === 'object' && e !== null
  && typeof (/** @type {{code?: unknown}} */ (e).code) === 'string'
  && (/** @type {{name?: unknown}} */ (e).name === 'PostgresError' || 'severity' in e);

/** @param {string} s */
const clean = (s) => s.replace(URL_RE, '<url>').slice(0, MAX);

/**
 * @param {unknown} err
 * @returns {{ reason: string, code?: string }}
 */
export function safeError(err) {
  let e = err;
  for (let depth = 0; depth < 5 && typeof e === 'object' && e !== null; depth++) {
    if (isPostgresError(e)) {
      const pg = /** @type {{ code: string, message?: unknown }} */ (e);
      return { reason: clean(String(pg.message ?? '')), code: pg.code };
    }
    e = /** @type {{cause?: unknown}} */ (e).cause;
  }
  if (err instanceof Error) {
    if (/^Failed query/.test(err.message)) return { reason: 'consulta a la base fallida (sin detalle)' };
    return { reason: clean(`${err.name}: ${err.message}`) };
  }
  return { reason: 'unknown' };
}
