# Plan: de Hostinger a Vercel + Supabase + Resend

> Aprobado por Luis (CEO) el 2026-11-26. **Este archivo es el "dónde estamos"**: se corrige en el
> momento en que algo deje de ser cierto. Visión del producto: [`vision-membresia.md`](vision-membresia.md).

## Dónde estamos (2026-11-26)

- Rama `develop`, empujada. `npm run check` en verde: 34 tests, 3 saltados (los de MySQL real).
- **Hostinger ya no existe** (plan cancelado y reembolsado el 2026-11-10). Nada de este proyecto está en vivo.
- El código **todavía** está conectado a Hostinger: MySQL, SMTP y migraciones al arrancar.
- Luis tiene **Vercel Pro** (equipo `techbuilddreams`, compartido con otros proyectos).
- **Un solo repo:** `techbuilddreams/actitudalfa360` (antes `actitudalfa360-site`, renombrado 2026-11-26).
  La app Nuxt vieja quedó archivada como `actitud-alfa-360-nuxt-archivo`. La carpeta local sigue siendo `actitudalfa360-site`.
- En Vercel existe un proyecto VIEJO `actitudalfa360` (Nuxt, `prj_cYMTPQkvTcOK7zArmDejQ0TcuEl9`) que tiene los dominios
  `actitudalfa360.com` y `www`. No se toca hasta el paso 4: ahí se mueven los dominios al proyecto nuevo.
- La rama por defecto en GitHub es `develop`: al crear el proyecto en Vercel, la de producción hay que fijarla en `main`
  ANTES de cargar variables de producción.

## Decisiones tomadas

| Pieza | Antes (Hostinger) | Ahora | Por qué |
|---|---|---|---|
| Hosting | Node en Hostinger | **Vercel Pro** | Ya pagado; Pro permite uso comercial; preview por rama |
| Base de datos | MySQL / MariaDB | **Supabase Postgres** (Drizzle `pg-core`) | Mismo stack que DR Factory; trae Auth |
| Login (membresía) | — | **Supabase Auth** | Gratis hasta ~50k usuarios activos al mes; mismos datos que la base |
| Correo | SMTP de Hostinger | **Resend** | Como DR Factory; el SMTP murió con el plan |
| Videos (membresía) | — | **Bunny Stream** con enlaces firmados | El más barato; Vercel no sirve para video |
| Staging | `STAGING_BASIC_AUTH` en `proxy.ts` | **Deployment Protection** de Vercel en previews | Lo da la plataforma; menos código propio |
| Migraciones | Al arrancar (`instrumentation.ts` + `GET_LOCK`) | **Paso de deploy** (`drizzle-kit migrate` en CI/build) | Serverless no tiene un "arranque" único |

**Costo:** $0 mientras construimos. Al lanzar, ~$25/mes por Supabase Pro (el plan gratis pausa
el proyecto tras una semana sin uso). Vercel ya está pagado.

**Se queda intacto:** `domain/`, `application/` (casos de uso y puertos) y sus tests. Solo cambian
los adaptadores de `infrastructure/` y su conexión en `container.ts`.

## La lista, en orden

Cada paso: el test que falla primero → el código mínimo → limpiar. Los pasos 2 y 3 tocan el camino
del dinero, así que pasan por **QA y un rompedor** antes de llegar a Luis.

1. **Conectar a Vercel y quitar Hostinger** (CTO)
   - Crear el proyecto en Vercel (equipo `techbuilddreams`), conectar GitHub: `main` = producción, `develop` = preview/staging.
   - Quitar `STAGING_BASIC_AUTH` de `proxy.ts` y usar Deployment Protection.
   - `TRUSTED_PROXY_HOPS` y el rate limit en memoria: en serverless cada instancia tiene su propia memoria. Revisar `src/infrastructure/security/` y decidir (ver Decisiones abiertas).
   - Actualizar `README.md`, `.env.example`, `src/config/env.ts` (y `tests/env.test.ts`).
2. **MySQL → Supabase Postgres** (Especialista en Postgres/concurrencia → QA → Rompedor)
   - Reescribir `src/infrastructure/db/schema.ts` con `pg-core`: ENUM nativo, `CHECK` de montos y moneda, `order_number` como identity desde 10001, índice único en `payment_ref`, índices `(status, created_at)`, `created_at`, `email`.
   - Reescribir `mysql-order-repository.ts` → repositorio Postgres. Mantener el compare-and-set (`UPDATE … WHERE status = …`) y el vencimiento del reclamo a 5 min.
   - Conexión por el **pooler de Supabase en modo transacción** (puerto 6543), no directa.
   - Borrar `drizzle/0000*` y `0001*` (nada vivo) y generar una migración Postgres limpia. Quitar `migrate.ts` + `instrumentation.ts` del arranque.
   - Portar `tests/mysql.int.test.ts` (20 webhooks simultáneos) a Postgres.
   - RLS activado en cada tabla (default-deny): el servidor usa la llave de servicio; el cliente no toca tablas.
3. **SMTP → Resend** (CTO → QA)
   - Nuevo adaptador del puerto `application/ports/mailer.ts`; borrar `smtp-mailer.ts`.
   - Verificar el dominio `actitudalfa360.com` en Resend (DKIM/SPF).
4. **DNS del dominio** (Luis + CTO) — puede ir en paralelo con 1–3
   - Hoy los NS son `dns-parking.com` (Hostinger) y **no hay MX**: `hola@actitudalfa360.com` no recibe correo.
   - Mover NS a Cloudflare como los demás dominios, apuntar a Vercel, Email Routing → Gmail para `hola@`.
   - Confirmar primero **dónde está registrado** el dominio (¿Hostinger?), porque eso decide quién cambia los NS.
5. **Primer deploy de staging + smoke** (CTO): compra de prueba con Stripe en modo test, de punta a punta (pago → pedido → correo → Printify en espera).
6. **Membresía** (trabajo nuevo, otra sesión, plan propio): usuarios, niveles, campus, Bunny. Ver `vision-membresia.md`. Antes: fase 1 en Skool para validar.

## Decisiones abiertas (con recomendación)

- **Rate limit en serverless:** la memoria no se comparte entre instancias. *Recomendación:* el Firewall de Vercel (reglas de rate limit) para `/api/checkout`, sin código propio.
- **¿Supabase en el mismo proyecto para staging y producción?** *Recomendación:* dos proyectos (staging gratis, producción Pro), para no mezclar datos de prueba con dinero real.
- **Pausa por gasto en el equipo de Vercel:** si está activa, un pico apaga *todos* los sitios del equipo. Revisar antes del lanzamiento.
- **Versión:** el proyecto ya está en `1.0.0` pero sin tags. La primera promoción a `main` lleva bump + tag `vX.Y.Z` y la versión visible en `/api/health`.

## Trampas conocidas

- `AGENTS.md`: este Next.js 16 **no** es el de la memoria del modelo; leer `node_modules/next/dist/docs/` antes de escribir código.
- `npm run check` necesita `npm ci` primero (el 2026-11-26 `node_modules` no existía y el check falló sin que el commit se detuviera).
- Un push a `develop` que suba commits viejos sin subir arrastra más de lo esperado: revisar `git log @{u}..` antes de empujar.

## Lo que NO se hace (a propósito)

- No se migran datos: no hay nada vivo.
- No se reescribe el dominio ni los casos de uso.
- No se construye la membresía hasta terminar los pasos 1–5 y validar en Skool.
