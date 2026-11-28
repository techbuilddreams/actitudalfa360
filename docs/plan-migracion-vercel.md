# Plan: de Hostinger a Vercel + Supabase + Resend

> Aprobado por Luis (CEO) el 2026-11-26. **Este archivo es el "dónde estamos"**: se corrige en el
> momento en que algo deje de ser cierto. Visión del producto: [`vision-membresia.md`](vision-membresia.md).

## Dónde estamos (2026-11-26)

- Rama `develop` (`db0d55b` + este commit). `npm run check` en verde: **107 tests** con `TEST_DATABASE_URL`
  (Postgres real); sin esa variable los de integración se saltan en local, pero en CI corren siempre (service `postgres:17`).
- **Paso 1 HECHO** (2026-11-26). **Paso 2 HECHO en código** (2026-11-26): 4 rondas especialista → QA → rompedor;
  QA aprobó, el rompedor no encontró P0/P1 en la última, y el CTO verificó la suite y el mutante sin `FOR UPDATE` (muere 3/3).
  **Paso 2 desplegado en staging (2026-11-27):** build de `develop` con `migrations_ok`; verificado en Supabase:
  2 migraciones, RLS activo, `anon`/`authenticated` sin privilegios, rol `postgres` con `statement_timeout=15s` e
  `idle_in_transaction_session_timeout=15s` (el `ALTER ROLE` SÍ está permitido en Supabase). **Paso 4 HECHO.**
- **Staging ya no publica sin Stripe: la BUILD falla** (2026-11-27, ronda 3). `vercel-build` corre primero
  `scripts/check-deploy.ts` (la misma `checkDeployment` que el arranque): sin `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`
  sale 1 con `deploy_check_failed` y Vercel deja vivo el deploy anterior, en vez de Ready + 500 en todo.
- **Hostinger ya no existe** (plan cancelado y reembolsado el 2026-11-10). Nada de este proyecto está en vivo.
- El código **todavía** usa SMTP (paso 3).
- Luis tiene **Vercel Pro** (equipo `techbuilddreams`, compartido con otros proyectos).
- **Un solo repo:** `techbuilddreams/actitudalfa360` (antes `actitudalfa360-site`, renombrado 2026-11-26).
  La app Nuxt vieja quedó archivada como `actitud-alfa-360-nuxt-archivo`. Carpeta local: `~/repos/actitudalfa360` (renombrada el mismo día; la memoria de Claude se copió a la ruta nueva).
- Proyecto viejo de Vercel (Nuxt) **BORRADO** por Luis el 2026-11-26. Dominios `actitudalfa360.com` y `www` (308 → apex)
  ya están en el proyecto nuevo, verificados; falta que el DNS apunte a Vercel (paso 4).
- **Staging = la URL fija que da Vercel** (`actitudalfa360-git-develop-techbuilddreams.vercel.app`). Sin dominio `staging.`
  propio (decisión de Luis: un registro DNS menos). Si aún aparece `staging.actitudalfa360.com` en Settings → Domains, quitarlo.
- Llaves de la app vieja (OpenAI, cuenta de servicio de Firebase): Luis dice que ya están cerradas (2026-11-26).
- **DNS (paso 4), 2026-11-26:** registrador Hostinger (vence 2027-11-03). Zona creada en Cloudflare (`8e0ee3b8…`, plan gratis)
  con A apex `216.150.1.1` + `216.150.16.1`, CNAME `www` → `497175f17830eef8.vercel-dns-016.com` (los que recomienda Vercel,
  **sin proxy**) y el TXT de Google Search Console copiado. NS cambiados en hPanel a `venkat`/`vera.ns.cloudflare.com`
  (Luis inició sesión, el CTO hizo el cambio por Chrome). Regla de correo `hola@` → `actitudalfa360@gmail.com` (verificado).
  **HECHO 2026-11-27:** zona activa; Email Routing activo (MX `route1-3.mx.cloudflare.net`, SPF, DKIM `cf2024-1`);
  Vercel ya no marca el dominio como misconfigured; HTTPS con certificado válido en apex y `www`. Ambos dan 404 hasta el
  primer deploy de producción desde `main` (esperado). Falta comprobar el 308 `www` → apex cuando haya deploy.
- La rama por defecto en GitHub es `develop`; la de producción en Vercel es `main` (ya fijada).

## Decisiones tomadas

| Pieza | Antes (Hostinger) | Ahora | Por qué |
|---|---|---|---|
| Hosting | Node en Hostinger | **Vercel Pro** | Ya pagado; Pro permite uso comercial; preview por rama |
| Base de datos | MySQL / MariaDB | **Supabase Postgres** (Drizzle `pg-core`) | Mismo stack que DR Factory; trae Auth |
| Login (membresía) | — | **Supabase Auth** | Gratis hasta ~50k usuarios activos al mes; mismos datos que la base |
| Correo | SMTP de Hostinger | **Resend** | Como DR Factory; el SMTP murió con el plan |
| Videos (membresía) | — | **Bunny Stream** con enlaces firmados | El más barato; Vercel no sirve para video |
| Staging | `STAGING_BASIC_AUTH` en `proxy.ts` | **Deployment Protection** de Vercel en previews | Lo da la plataforma; menos código propio |
| Migraciones | Al arrancar (`instrumentation.ts` + `GET_LOCK`) | **Paso de build** (`vercel-build` → `scripts/migrate.mjs` con `pg_advisory_lock`) | Serverless no tiene un "arranque" único |

**Costo:** $0 mientras construimos. Al lanzar, ~$25/mes por Supabase Pro (el plan gratis pausa
el proyecto tras una semana sin uso). Vercel ya está pagado.

**Se queda intacto:** `domain/`, `application/` (casos de uso y puertos) y sus tests. Solo cambian
los adaptadores de `infrastructure/` y su conexión en `container.ts`.

## La lista, en orden

Cada paso: el test que falla primero → el código mínimo → limpiar. Los pasos 2 y 3 tocan el camino
del dinero, así que pasan por **QA y un rompedor** antes de llegar a Luis.

1. **Conectar a Vercel y quitar Hostinger** (CTO)
   - **Hecho 2026-11-26:** proyecto Vercel `actitudalfa360` (`prj_WXVtjCJ2aZb8n2wbqFkZAov7hiRa`), Next.js, Node 22,
     Vercel Authentication en previews + URLs de producción (`prod_deployment_urls_and_all_previews`).
     Variables Preview: `APP_ENV`/`NEXT_PUBLIC_APP_ENV=staging`, `NEXT_PUBLIC_SITE_URL` = alias `git-develop`.
     Secreto de *Protection Bypass for Automation* generado (se expone como `VERCEL_AUTOMATION_BYPASS_SECRET`;
     verlo en Settings → Deployment Protection, nunca en el repo) para el webhook de Stripe en el paso 5.
   - Rama de producción = `main` (Settings → Environments → Production). **Candado extra:** *Ignored Build Step* del
     proyecto salta cualquier build de producción que no venga de `main` (el 2026-11-26 un push a `develop` salió
     como producción; se canceló antes de terminar).
   - **Smoke 2026-11-26 (preview `a4aa99a`):** sin sesión → 302 al login de Vercel; con el bypass → 500 porque
     `assertDeployable` exige DATABASE_URL + Stripe en staging. Es lo esperado: falla cerrado hasta los pasos 2/3/5.
   - `engines.node` fijado a `22.x` (con `>=20.9` Vercel ignoraba el ajuste y usaba Node 26).
   - Staging: `actitudalfa360-git-develop-techbuilddreams.vercel.app` (definitivo).
     Hecho: variables Production (`APP_ENV`/`NEXT_PUBLIC_APP_ENV=production`, `NEXT_PUBLIC_SITE_URL=https://actitudalfa360.com`)
     y el primer push a `develop` → preview → verificar 401 sin sesión.
   - Crear el proyecto en Vercel (equipo `techbuilddreams`), conectar GitHub: `main` = producción, `develop` = preview/staging.
   - Quitar `STAGING_BASIC_AUTH` de `proxy.ts` y usar Deployment Protection.
   - `TRUSTED_PROXY_HOPS` y el rate limit en memoria: en serverless cada instancia tiene su propia memoria. Revisar `src/infrastructure/security/` y decidir (ver Decisiones abiertas).
   - Actualizar `README.md`, `.env.example`, `src/config/env.ts` (y `tests/env.test.ts`).
2. **MySQL → Supabase Postgres** (Especialista en Postgres/concurrencia → QA → Rompedor)
   - **Hecho en rama `paso-2-postgres` (2026-11-26), pendiente de QA y Rompedor:** esquema `pg-core`, migración
     limpia `drizzle/0000_init.sql` + `0001_rls_trigger.sql` (trigger `updated_at`, RLS sin políticas, REVOKE a
     anon/authenticated si existen), `PostgresOrderRepository` (`ON CONFLICT DO NOTHING RETURNING`), `scripts/migrate.mjs`
     con lock, `vercel-build`, `DATABASE_MIGRATION_URL`, Postgres en CI. `tests/postgres.int.test.ts` corre en CI.
   - **Ronda 2 (tras QA + Rompedor), misma rama:** el reclamo usa el reloj de la BASE (`now()`) y un token de turno
     (`claim_token`, `gen_random_uuid()`); `completeFulfillment` exige el token y devuelve false si el turno era de
     otro (se registra `fulfillment_claim_lost`). CHECK `processing ⇒ claimed_at y claim_token`. `email` a `text`;
     `lines` vacío se guarda con línea centinela `DESCONOCIDO` en estado `paid` + `order_lines_missing`. Logs sin PII ni
     credenciales (`src/lib/safe-error.mjs`). `migrate.mjs`: valida la URL sin filtrarla, rechaza 6543, `lock_timeout`
     5 s tras el lock, en Vercel solo migran `main`/`develop`. `/api/health` reporta `schema` (ok/behind/ahead).
     CHECK de cuadre sin hueco con subtotal 0. `toDomain` descarta líneas corruptas. Test de REVOKE con roles tipo
     Supabase. 6 mutantes matados (guardia de token, guardia de estado, REVOKE, CHECKs >= 0, reloj de app, CHECK processing).
   - **Ronda 3 (QA aprobó la 2; arreglos del Rompedor):** migraciones fusionadas en una inicial (`0000_init` generada +
     `0001_rls_trigger` a mano; no existía ninguna base). Una ref real de Printify SIEMPRE gana a un fallo:
     `completeFulfillment` devuelve `closed | stale | recorded | double` (logs `fulfillment_recovered`,
     `fulfillment_claim_lost`, `fulfillment_double`). `statement_timeout` 15 s en el ROL (migración), no en la conexión.
     Correo al cliente sin la línea centinela ("Detalle del pedido en revisión"). `migrate.mjs`: `main`↔`production`,
     `develop`↔`preview`; URL con `#` rechazada (también en `env.ts`). `safeError` registra solo el código en la clase 22.
   - **Ronda 4:** el UPDATE de la ref tardía usa `RETURNING` (0 filas ⇒ `double`/`stale`, nunca `recorded`); tortura R11
     en la suite (mata "sin `FOR UPDATE`" 3 de 3); recuperado/doble van por `Notifier.fulfillmentAnomaly` (log + correo a
     la tienda, nunca al cliente); `idle_in_transaction_session_timeout` 15 s en el rol.
   - **Antes del lanzamiento (otro trabajo):** alertas sobre los logs `order_lines_missing`, `fulfillment_claim_lost`,
     `fulfillment_recovered`, `fulfillment_double` y `webhook_processing_failed`.
   - **Deuda anotada (no se hizo en esta ronda):**
     - Rol de app con mínimo privilegio (hoy la app conecta como el dueño de la tabla).
     - Comprobar que `DATABASE_URL` y `DATABASE_MIGRATION_URL` apuntan al mismo proyecto Supabase.
     - Verificar si Printify rechaza un `external_id` repetido (proceso que muere tras el OK de Printify ⇒ el reclamo
       vence y otro proceso podría crear una segunda producción; hoy solo queda el log `fulfillment_claim_lost`).
   - **Proyecto de staging:** `actitudalfa360-staging` (ref `jsusmetqafmechlkbjyu`, us-east-1, Postgres 17, plan gratis,
     org `actitudalfa360` con la cuenta `actitudalfa360@gmail.com`). Ya existía vacío (0 tablas); se renombró el 2026-11-27.
     Host de los poolers: `aws-2-us-east-1.pooler.supabase.com`, usuario `postgres.jsusmetqafmechlkbjyu`, base `postgres`.
   - **HECHO 2026-11-27:** `DATABASE_URL` (6543) y `DATABASE_MIGRATION_URL` (5432) en Vercel con alcance **solo Preview**
     (se guardaron primero en Production por error y se movieron; producción NO debe apuntar a staging).
     Sin `DATABASE_MIGRATION_URL` la build de Vercel falla a propósito. Las ramas de feature NO migran
     (sus previews pueden ver `schema: behind` en `/api/health`).
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
   - **HECHO** (2026-11-27). Detalle en "Dónde estamos".
5. **Primer deploy de staging + smoke** (CTO): compra de prueba con Stripe en modo test, de punta a punta (pago → pedido → correo → Printify en espera).
   - **HECHO (2026-11-28).** Compra con 4242 en staging (`52de6a7`): webhook firmado aceptado, log `Nueva venta`
     (3398 ¢, 1 artículo), sin errores. `/api/health` 200: stripe test, webhook, database, schema ok.
   - Cuenta: sandbox **Actitud Alfa 360 sandbox** (`acct_1UImVaGpmK8g…`), NO la cuenta live (`acct_1UImVS…`) ni
     Tech Build Dreams. En el selector: Other accounts → Actitud Alfa 360 → Switch to sandbox.
   - Endpoint: se **editó** el existente `aa360` (`we_1UIsdB…`), no se creó otro. El *signing secret* es del endpoint,
     no de la URL: al cambiar la URL, el `whsec_` de `.env.staging` siguió valiendo (antes se creía lo contrario).
     URL = alias `git-develop` + `?x-vercel-protection-bypass=<secreto>`; el secreto lo pegó Luis.
   - Vercel Preview (todas las ramas, Sensitive): `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`, subidas con
     `vercel env add <K> --environment preview --sensitive --yes` leyendo stdin desde `.env.staging`.
   - Verificado en Supabase: pedido **10001** `paid`, 3398 ¢, `AA360-TAZA-15-NEGRA`, con envío; 1 fila = 1 pago.
     `statement_timeout` = 15s por el 6543. `.env.staging` ya tiene la `DATABASE_URL` de Supabase (antes, la MySQL de Hostinger).
     En staging `printifyAutoOrder=false`: el pedido queda `paid` (producción a mano).
   - Trampas: sin `--yes`, `vercel env add` pregunta la rama y se come el valor que llega por stdin. `vercel link`
     corrido fuera del repo deja `~/.vercel` (borrarlo). `vercel curl <ruta> --deployment <url>` pasa la protección
     sin manejar el secreto. `npx vercel` (v68) funciona aunque no haya `vercel` en el PATH.
6. **Membresía** (trabajo nuevo, otra sesión, plan propio): usuarios, niveles, campus, Bunny. Ver `vision-membresia.md`. Antes: fase 1 en Skool para validar.

## Decisiones abiertas (con recomendación)

- **Rate limit en serverless:** la memoria no se comparte entre instancias. *Recomendación:* el Firewall de Vercel (reglas de rate limit) para `/api/checkout`, sin código propio.
- **¿Supabase en el mismo proyecto para staging y producción?** *Recomendación:* dos proyectos (staging gratis, producción Pro), para no mezclar datos de prueba con dinero real.
- **Pausa por gasto en el equipo de Vercel:** si está activa, un pico apaga *todos* los sitios del equipo. Revisar antes del lanzamiento.
- **Versión:** el proyecto ya está en `1.0.0` pero sin tags. La primera promoción a `main` lleva bump + tag `vX.Y.Z` y la versión visible en `/api/health`.

## Trampas conocidas

- **SPF único:** el dominio ya tiene `v=spf1 include:_spf.mx.cloudflare.net ~all` (Email Routing). Al verificar Resend
  (paso 3) se **edita ese mismo registro** añadiendo su `include:`; dos registros SPF = SPF inválido y correos a spam.
- **Comprobar NS en el registro:** `dig NS <dominio> @a.gtld-servers.net +noall +authority`. Con `+short` sale vacío
  (la delegación viene en la sección authority) y un vigilante que lo use nunca detecta el cambio.
- **`npm run check | grep …` esconde el código de salida:** el 2026-11-26 un commit salió con el check en rojo así.
  Comprobar el exit code (`; echo $?`) antes de commitear.

- `AGENTS.md`: este Next.js 16 **no** es el de la memoria del modelo; leer `node_modules/next/dist/docs/` antes de escribir código.
- `npm run check` necesita `npm ci` primero (el 2026-11-26 `node_modules` no existía y el check falló sin que el commit se detuviera).
- **Supabase pooler: transacción (6543) vs sesión (5432).** La app usa el 6543 ⇒ `prepare: false` obligatorio
  (los prepared statements viven en una conexión y el pooler cambia de conexión por transacción). Los locks de
  sesión (`pg_advisory_lock`) NO funcionan por el 6543: la migración va por el 5432. La conexión directa
  (`db.<ref>.supabase.co`) es solo IPv6 y las builds de Vercel pueden no tenerlo.
- El migrador de Drizzle (pg) no toma ningún lock: dos builds a la vez sobre una base vacía fallan con
  `CREATE SCHEMA drizzle` (probado quitando el lock: 3/3 rojo). El lock está en `scripts/migrate.mjs`.
- `postgres.js` + un **string** a una columna `jsonb` (SQL a mano, `sql(row)`) guarda un escalar string, no la
  lista: usar `sql.json(valor)`. Drizzle lo hace bien solo. El CHECK `orders_lines_ck` lo atrapa.
- `postgres` se fija en `^3.4.9`: la 4.x salió en 2026-10-29 y `drizzle-orm` 0.45 está hecho contra la 3.
- Homebrew `postgresql@18` en esta Mac quedó sin enlazar (choca con `libpq`): `initdb` fallaba buscando
  `share/postgresql@18` y `lib/postgresql@18`. Se arregló con dos symlinks en `/opt/homebrew/{share,lib}/postgresql@18`
  → `Cellar/postgresql@18/18.7/...`. Usar `/opt/homebrew/Cellar/postgresql@18/18.7/bin/{initdb,pg_ctl}`.
- Un CHECK que falla junto con otro reporta el primero **por nombre** (orden alfabético): un test de "columna
  negativa" con una fila que no cuadra ve `orders_amounts_ck`, no el suyo, y pasa aunque falte su CHECK. Los tests
  usan filas que cuadran y exigen el nombre de la restricción.
- `new URL()` / postgres.js con una contraseña con `#` sin codificar lanzan un `TypeError` cuyo `input` es la URL
  entera: validar con try/catch sin propagar el error. `DrizzleQueryError.message` trae TODOS los parámetros
  (correo, dirección): loguear solo con `safeError`.
- Comparar `claimed_at` en JS pierde los microsegundos de `now()`: por eso el token de turno es un uuid y no la hora.
- **Migraciones FUTURAS sobre una tabla viva:** nunca `ADD CONSTRAINT ... CHECK` validado de golpe (falla con filas
  viejas o con un pedido en vuelo, y bloquea la tabla mientras valida). Usar `ADD CONSTRAINT ... NOT VALID` →
  backfill → `VALIDATE CONSTRAINT` en una migración aparte. Igual con `NOT NULL` (vía CHECK NOT VALID). La ronda 2
  rompió esto con `orders_processing_claim_ck`; como no había base, se fusionó todo en la inicial.
- `statement_timeout` va en el rol (`ALTER ROLE <rol> IN DATABASE <db> SET`, migración 0001), no como parámetro de
  conexión: el pooler de transacción no conserva `SET` y puede rechazar parámetros de arranque. Verificado en el rol
  `postgres` de Supabase el 2026-11-27 (`pg_db_role_setting`); falta ver `SHOW` desde la app por el 6543 (paso 5). El ajuste persiste aunque
  se borre el esquema. Si la app pasa a un rol propio (deuda), moverlo a ese rol.
- **El `ALTER ROLE` sobre `postgres` también limita a 15 s** (statement e idle-in-transaction) el SQL editor/Studio de
  Supabase y `supabase db push`. Para una consulta larga en Studio: `SET statement_timeout = 0;` en esa sesión. La salida
  definitiva es el rol de app de mínimo privilegio (deuda): el límite pasa a ese rol y `postgres` queda libre.
- `ALTER ROLE ... IN DATABASE ... SET` **sí está permitido** al rol `postgres` en Supabase (verificado 2026-11-27).
- **Redeploy desde el dashboard de Vercel** puede reconstruir un commit VIEJO (el 2026-11-27 se relanzó `bc7d3fc`, previo
  al paso 2). Para staging: redeploy del deploy más reciente de `develop`, o un push.
- Sin probar a propósito: el `SET statement_timeout = '10min'` de `migrate.mjs` (mutante M23). Probarlo exige una DDL de
  más de 15 s; no compensa hasta que haya una migración así.
- La tortura R11 (`tests/postgres.int.test.ts`, 200 rondas, ~2 s; `R11_ROUNDS` la cambia) es la única que mata quitar el
  `FOR UPDATE` de `completeFulfillment`. No bajarla sin repetir la prueba del mutante.
- `tests/postgres.int.test.ts` BORRA el esquema `public`: se niega a correr si el nombre de la base no contiene `test`.
- Un push a `develop` que suba commits viejos sin subir arrastra más de lo esperado: revisar `git log @{u}..` antes de empujar.

## Lo que NO se hace (a propósito)

- No se migran datos: no hay nada vivo.
- No se reescribe el dominio ni los casos de uso.
- No se construye la membresía hasta terminar los pasos 1–5 y validar en Skool.
