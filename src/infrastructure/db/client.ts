import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

let client: postgres.Sql | undefined;
let db: Db | undefined;

/**
 * Pool único por proceso (reutiliza conexiones entre invocaciones de la misma instancia).
 * Pensado para el pooler de Supabase en MODO TRANSACCIÓN (puerto 6543): ahí cada sentencia puede caer en
 * otra conexión del servidor, así que `prepare: false` es obligatorio (los prepared statements viven en una).
 * Pool pequeño: cada instancia serverless abre el suyo y el pooler tiene un tope de clientes.
 */
export function getDb(url: string, poolSize = 5): Db {
  if (!db) {
    client = postgres(url, { max: poolSize, prepare: false, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
    db = drizzle(client, { schema });
  }
  return db;
}

/** Cierra el pool (tests / scripts). En el servidor no hace falta: el proceso muere con la instancia. */
export async function closeDb(): Promise<void> {
  const c = client;
  client = undefined;
  db = undefined;
  await c?.end({ timeout: 5 });
}
