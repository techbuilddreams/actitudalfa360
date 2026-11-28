import 'server-only';
import { z } from 'zod';

/**
 * Variables de entorno del servidor, validadas con Zod.
 * Los secretos son opcionales al compilar (el build no los necesita);
 * cada adaptador exige los suyos con `requireEnv` al usarse.
 */
/** URL Postgres parseable. Nunca devuelve ni registra el valor: lleva la contraseña. */
const isPostgresUrl = (v: string) => {
  try {
    const u = new URL(v);
    // Un # en la URL es una contraseña sin codificar (p. ej. postgres:5999#Zx@host se leería como puerto 5999).
    return (u.protocol === 'postgres:' || u.protocol === 'postgresql:') && u.hash === '';
  } catch {
    return false;
  }
};
const postgresUrl = z.string().refine(isPostgresUrl, 'debe ser una URL postgres:// o postgresql:// válida (¿# sin codificar?)');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),

  STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_AUTOMATIC_TAX: z.stringbool().default(false),

  // Runtime: pooler de Supabase en modo TRANSACCIÓN (puerto 6543).
  DATABASE_URL: postgresUrl.optional(),
  // Solo la build (scripts/migrate.mjs): pooler en modo SESIÓN (puerto 5432). La app no la usa.
  DATABASE_MIGRATION_URL: postgresUrl.optional(),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(20).default(5),

  PRINTIFY_AUTO_ORDER: z.stringbool().default(false),
  PRINTIFY_API_TOKEN: z.string().min(20).optional(),
  PRINTIFY_SHOP_ID: z.string().regex(/^\d+$/).optional(),

  // Correo transaccional (SMTP de Hostinger). Si falta SMTP_PASSWORD, no se envían correos.
  SMTP_HOST: z.string().default('smtp.hostinger.com'),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_USER: z.email().optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().default('Actitud Alfa 360 <hola@actitudalfa360.com>'),
  ORDER_NOTIFY_EMAIL: z.email().optional(),

  // Centavos enteros, de 0 a $100. Un "" o "1e3" ya no valen 0/1000 en silencio.
  SHIPPING_FLAT_CENTS: z.string().regex(/^\d{1,5}$/).default('899').transform(Number).pipe(z.number().int().max(10_000)),

  /** Lo pone Vercel solo (variable de sistema). Sirve para detectar variables cruzadas entre entornos. */
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
});

export type ServerEnv = z.infer<typeof schema>;

/**
 * Reglas extra para servidores desplegados (staging/producción). Se verifican al ARRANCAR (instrumentation):
 * una configuración incompleta tumba el arranque en vez de perder pedidos en silencio.
 */
export function deploymentProblems(e: ServerEnv): string[] {
  const problems: string[] = [];
  if (e.APP_ENV === 'local') return problems;
  const need = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
  for (const k of need) if (!e[k]) problems.push(`${k} es obligatoria en ${e.APP_ENV}`);
  if (!e.NEXT_PUBLIC_SITE_URL.startsWith('https://')) problems.push('NEXT_PUBLIC_SITE_URL debe ser https');
  const live = e.STRIPE_SECRET_KEY?.includes('_live_');
  if (e.APP_ENV === 'production' && e.STRIPE_SECRET_KEY && !live) problems.push('Producción requiere una llave de Stripe live');
  if (e.APP_ENV === 'staging' && live) problems.push('Staging no puede usar una llave de Stripe live');
  if (e.PRINTIFY_AUTO_ORDER && (!e.PRINTIFY_API_TOKEN || !e.PRINTIFY_SHOP_ID)) problems.push('PRINTIFY_AUTO_ORDER requiere PRINTIFY_API_TOKEN y PRINTIFY_SHOP_ID');
  // En Vercel, cada variable tiene un alcance (Production / Preview). Un preview con APP_ENV=production
  // cobraría con la llave live desde una rama sin revisar; y al revés, producción quedaría en modo prueba.
  if (e.VERCEL_ENV === 'preview' && e.APP_ENV === 'production') problems.push('VERCEL_ENV=preview no puede correr con APP_ENV=production');
  if (e.VERCEL_ENV === 'production' && e.APP_ENV !== 'production') problems.push(`VERCEL_ENV=production requiere APP_ENV=production (hay ${e.APP_ENV})`);
  if (Boolean(e.SMTP_USER) !== Boolean(e.SMTP_PASSWORD)) problems.push('SMTP_USER y SMTP_PASSWORD van juntas');
  return problems;
}

/** Un servidor de producción (`next start`) sin APP_ENV explícito es un error de despliegue, no "local". */
export function assertDeployable(raw: NodeJS.ProcessEnv = process.env): void {
  if (raw.NODE_ENV === 'production' && !raw.APP_ENV) throw new Error('APP_ENV es obligatoria al ejecutar en modo producción (local | staging | production)');
  const problems = deploymentProblems(env());
  if (problems.length) throw new Error(`Configuración inválida: ${problems.join('; ')}`);
}

/** Valida variables sin tocar la caché ni lanzar (para tests y diagnósticos). */
export const parseEnv = (raw: Record<string, string | undefined>) => schema.safeParse(raw);

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
