import { sql } from 'drizzle-orm';
import journal from '../../../drizzle/meta/_journal.json';
import type { Db } from './client';

export type SchemaStatus = 'ok' | 'behind' | 'ahead' | 'unknown';

/**
 * Compara la última migración aplicada en la base (`created_at` = `when` del journal) con la última que trae
 * este código. Pura: sin I/O.
 * - behind: a la base le falta una migración que este código espera ⇒ peligroso (consultas a columnas que no existen).
 * - ahead: otra rama ya migró la base más allá; es el estado normal durante un despliegue (expand/contract).
 */
export function compareSchema(lastApplied: number | null, expected: number): SchemaStatus {
  if (lastApplied === null || lastApplied < expected) return 'behind';
  return lastApplied > expected ? 'ahead' : 'ok';
}

/** El journal se empaqueta en la build (import JSON): no depende de que `drizzle/` exista en el servidor. */
export const expectedMigration = (): number => Math.max(...journal.entries.map((e) => e.when));

/** Lee la última migración aplicada. Si la tabla de Drizzle no existe (base sin migrar) ⇒ behind. */
export async function checkSchema(db: Db): Promise<SchemaStatus> {
  try {
    const rows = await db.execute<{ last: string | null }>(sql`SELECT max(created_at)::text AS last FROM drizzle.__drizzle_migrations`);
    const last = rows[0]?.last;
    return compareSchema(last == null ? null : Number(last), expectedMigration());
  } catch (err) {
    if ((err as { cause?: { code?: string } })?.cause?.code === '42P01') return 'behind'; // undefined_table
    return 'unknown';
  }
}
