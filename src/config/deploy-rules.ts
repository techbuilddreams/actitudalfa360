import { z } from 'zod';

/*
 * Reglas de configuración, PURAS (solo zod): las comparten el servidor (`env.ts`, con 'server-only') y el paso de
 * build `scripts/check-deploy.ts`, que corre con `node --experimental-strip-types` antes de migrar y de `next build`.
 * Sin imports relativos ni alias `@/`: Node las carga tal cual.
 */

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

export const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  // Lo que ve el NAVEGADOR (banner «pagos en modo prueba», noindex). Al desplegar debe ser igual a APP_ENV.
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production']).optional(),
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

  // Adaptador del alta del reto. 'log' (F2) solo registra y no puede ir a producción. 'resend' entra con F3, no antes:
  // un valor aceptado sin adaptador pasaría la compuerta y lanzaría en cada alta.
  RETO_SIGNUP: z.enum(['log']).default('log'),

  /** Lo pone Vercel solo (variable de sistema). Sirve para detectar variables cruzadas entre entornos. */
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
});

export type ServerEnv = z.infer<typeof schema>;

/**
 * Reglas extra para servidores desplegados (staging/producción). Primera línea: el paso de BUILD
 * (`scripts/check-deploy.ts` en `vercel-build`) sale ≠ 0 y Vercel deja vivo el deploy anterior. Segunda línea: el
 * arranque (instrumentation → `assertDeployable`) vuelve a comprobarlas por si el entorno cambió sin rebuild.
 */
export function deploymentProblems(e: ServerEnv): string[] {
  const problems: string[] = [];
  const live = e.STRIPE_SECRET_KEY?.includes('_live_');
  // Antes de la salida temprana de 'local': un local (o un preview mal etiquetado) con llave live cobra dinero real.
  if (live && e.APP_ENV !== 'production') problems.push(`Una llave de Stripe live solo vale con APP_ENV=production (hay ${e.APP_ENV})`);
  if (e.APP_ENV === 'local') return problems;
  const need = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
  for (const k of need) if (!e[k]) problems.push(`${k} es obligatoria en ${e.APP_ENV}`);
  // Si no coinciden, producción puede mostrar el banner de staging y noindex mientras cobra live (o al revés).
  if (e.NEXT_PUBLIC_APP_ENV !== e.APP_ENV) problems.push(`NEXT_PUBLIC_APP_ENV debe ser igual a APP_ENV=${e.APP_ENV} (hay ${e.NEXT_PUBLIC_APP_ENV ?? 'nada'})`);
  if (!e.NEXT_PUBLIC_SITE_URL.startsWith('https://')) problems.push('NEXT_PUBLIC_SITE_URL debe ser https');
  if (e.APP_ENV === 'production' && e.STRIPE_SECRET_KEY && !live) problems.push('Producción requiere una llave de Stripe live');
  if (e.PRINTIFY_AUTO_ORDER && (!e.PRINTIFY_API_TOKEN || !e.PRINTIFY_SHOP_ID)) problems.push('PRINTIFY_AUTO_ORDER requiere PRINTIFY_API_TOKEN y PRINTIFY_SHOP_ID');
  // En Vercel, cada variable tiene un alcance (Production / Preview). Un preview con APP_ENV=production
  // cobraría con la llave live desde una rama sin revisar; y al revés, producción quedaría en modo prueba.
  if (e.VERCEL_ENV === 'preview' && e.APP_ENV === 'production') problems.push('VERCEL_ENV=preview no puede correr con APP_ENV=production');
  if (e.VERCEL_ENV === 'production' && e.APP_ENV !== 'production') problems.push(`VERCEL_ENV=production requiere APP_ENV=production (hay ${e.APP_ENV})`);
  if (Boolean(e.SMTP_USER) !== Boolean(e.SMTP_PASSWORD)) problems.push('SMTP_USER y SMTP_PASSWORD van juntas');
  if (e.APP_ENV === 'production' && e.RETO_SIGNUP === 'log')
    problems.push('El alta del reto solo registra en el log: falta F3 (Resend + suscriptores). No se puede publicar así');
  return problems;
}

/** Valida variables sin tocar la caché ni lanzar (para tests y diagnósticos). */
export const parseEnv = (raw: Record<string, string | undefined>) => schema.safeParse(raw);

/**
 * La compuerta completa sobre el entorno CRUDO (una sola fuente para la build y el arranque):
 * variables inválidas, APP_ENV ausente donde no puede faltar, y `deploymentProblems`. Nunca incluye valores.
 */
export function checkDeployment(raw: Record<string, string | undefined>): string[] {
  const parsed = parseEnv(raw);
  if (!parsed.success) return [`Variables de entorno inválidas: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`];
  // En Vercel (build o runtime) o en un `next start`, la falta de APP_ENV es un error de despliegue, no "local".
  // VERCEL=1 lo pone Vercel siempre, aunque no exponga VERCEL_ENV a la build; un `npm run build` local no lo tiene.
  if (!raw.APP_ENV && (raw.NODE_ENV === 'production' || raw.VERCEL_ENV || raw.VERCEL === '1'))
    return ['APP_ENV es obligatoria al desplegar o ejecutar en modo producción (local | staging | production)'];
  return deploymentProblems(parsed.data);
}
