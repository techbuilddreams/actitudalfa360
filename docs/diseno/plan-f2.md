# Plan F2: home, /reto-30-dias y ficha según `maqueta-unificada.html`

> Propuesto por el CTO el 2026-11-27. Fuente: `revision-maqueta.md` (decisiones 1-14 + correcciones sin decisión).
> Rama: `f2-paginas` desde `develop` (`7c16ad1`). Nada está en producción, así que F2 puede vivir en `develop`.

## Alcance, en orden (cada bloque: test rojo → verde → refactor)

1. **Núcleo puro (dominio/lib), primero.**
   - `estimateDelivery(today, handling, transit)` → rango de fechas en días hábiles (5 y 12 hoy, sacados de
     `site.shipping`, no escritos a mano). Salta sábado y domingo. Feriados: fuera (sin decidir).
   - `kitLines(currentSku, otherSku)` → la pieza de la ficha va **primero** (de eso depende `cancelUrl`).
   - Formato de fecha «vie. 4» / «mar. 15 de dic.» como función pura con la fecha inyectada.
   - Validación de correo del formulario (misma regla en cliente y servidor).
2. **Sistema visual.** Tokens de la maqueta (`--ink`, `--bone`, `--stone`, `--gold`, `--paper`) en `globals.css`,
   Archivo + Cormorant (ya están en `src/app/fonts`). Más las correcciones de a11y de la revisión:
   bordes a 3:1, foco sobre hueso, placeholder ≥ 4.5:1, `[hidden]{display:none!important}`, áreas ≥ 44 px,
   pie sin saltar de H2 a H4.
3. **Cabecera y pie.** Menú de 4 (Reto, Pilares, Tienda, Membresía). Guías fuera. Sin enlaces muertos:
   lo que no existe no se enlaza.
4. **Home** (secciones de la maqueta). Copy en `copy.json`; precios y envío salen del catálogo/env, nunca a mano.
5. **/reto-30-dias.** Reglas como tabla, «si fallas», un día del reto, «sigue con una escuadra» (sin pago),
   FAQ, aviso de salud junto a cada formulario. Schema WebPage + BreadcrumbList. Sitemap.
6. **Ficha.** Precio junto al nombre, botón en la primera pantalla a 390 px, «Llega aprox.» con la función de (1),
   aviso de impuesto (test de componente, cierra el hueco de la revisión), kit con test de UI (pieza actual
   primero), barra fija con un **centinela** observado (no el botón). Enlace a su pilar.
7. **Formulario del reto** (`EmailCapture`): componente probado con un puerto inyectado. Ver decisión A.

## Equipo

- **Especialista en UI** construye 2-6 en un worktree, contra la maqueta.
- **Especialista en dominio** construye 1 (puro, rápido) en paralelo.
- **QA de UI** verifica contra la maqueta y la revisión (no construyó).
- **Rompedor de compra** ataca la ficha y el kit (toca dinero: obligatorio).

## Lo que NO se hace en F2

- Suscriptores, doble confirmación, correo diario, enlaces firmados, puntuación (F3; depende del paso 3, Resend).
- Páginas de pilares, guías, manifiesto largo, `/tienda`, `/membresia`. Las migas siguen a `/#tienda`.
- Fotos nuevas: se usan las de `public/img` con el marco de papel.
- Feriados en la fecha de entrega.

## Decisiones de Luis (2026-11-27)

- **A. Formulario:** UI + puerto en F2; el adaptador del servidor solo registra. Una barrera de deploy impide
  producción hasta F3 (Resend + suscriptores).
- **B. Reglas:** se publica el borrador del CTO desde `copy.json`; Luis lo valida antes de producción.
- **C. Fundador:** fuera hasta que Luis mande foto y las tres líneas. No se publica un relleno.

## Dónde estamos (2026-11-27, cierre de la sesión F2)

- **PR #8 fusionado a `develop`** el 2026-11-28 (fast-forward a `45ec42e`, OK de Luis). **321 tests** en verde (37 de Postgres se saltan sin base local; en CI corren).
  CI verde. El preview de Vercel **falla a propósito** en la build: `deploy_check_failed` por falta de `STRIPE_SECRET_KEY` /
  `STRIPE_WEBHOOK_SECRET` en staging (paso 5). Antes daba 500 en todo; ahora la build falla y queda vivo el deploy anterior.
- Revisado por QA de UI y tres rondas de Rompedor. Sin P0/P1 abiertos. Mutantes vivos de cada ronda: todos muertos.
- **Producción bloqueada hasta F3** por la compuerta (`src/config/deploy-rules.ts`, primer paso de `vercel-build`).

## Siguiente, en orden

1. ~~OK para fusionar el PR #8~~ hecho (2026-11-28).
2. **Luis:** validar el borrador de reglas del reto. ~~Texto de privacidad del reto~~ aprobado el 2026-11-28 (rama
   `privacidad-reto`). Lo que promete y F3 tiene que cumplir con test: borrar las casillas
   `site.privacy.deleteAfterUnsubscribeDays` días después de la baja, guardar solo el correo en una lista de bajas,
   ningún dato del reto hacia GA4/anuncios, no guardar la promesa diaria, y responder en `site.privacy.responseDays` días.
3. ~~Dirección postal~~ hecha (2026-11-28: la de la LLC, en `site.postalAddress`, con test del pie).
   **Luis:** feriados en la fecha de entrega: sí/no (sigue abierto).
4. ~~Test inestable «20 webhooks simultáneos ⇒ 1 pedido»~~ hecho (2026-11-28, `3398774`). Era bug del **test**, no de
   producción: el creador del pedido puede perder el reclamo de producción ante un reenvío y sale con `RetryLaterError`
   (Stripe reintenta → 200 `duplicate`; 1 aviso, 1 producción). El test ahora mide `orderPaid` + la fila, y hay un test
   de intercalación forzada (determinista). 15 corridas seguidas en verde; mutante «avisar en duplicados» muerto.
5. F3: Resend + suscriptores con doble confirmación + registro diario. Al cerrarlo, añadir el adaptador real a `RETO_SIGNUP`.
   Cumplir las promesas de la política del reto (punto 2).
6. Medición: decidida en `docs/ideas/medicion-y-descubrimiento.md` (sesión propia; empieza por consentimiento + GA4).

## Aceptado a propósito (no «arreglar»)

- Con red > 8 s un segundo clic puede abrir otra sesión de Stripe (nunca cobra dos veces; la sesión huérfana caduca).
- El recibo por correo dice «Envío $0.00» con envío gratis (recibo detallado).
- La fecha de entrega usa el día local del visitante; sin feriados; `Asia/Kolkata` puede guardarse como `Asia/Calcutta` según el ICU.
- Zonas antiguas tipo `US/Eastern` se rechazan.

## Trampas

- Con la máquina cargada (p. ej. Xcode compilando otro proyecto, load > 100) fallan por timeout de 5 s
  `reto-signup-real-route` y los dos del kit agotado en la home: cargan el contenedor real. Sin carga pasan.

- Los worktrees de agentes a veces nacen en una base vieja: el brief debe empezar con `git reset --hard <rama>`.
- `next build` no acepta `node_modules` enlazado: en un worktree, `cp -c -R` desde el checkout principal.
- `scripts/check-deploy.ts` necesita Node ≥ 22.6 (`--experimental-strip-types`); CI lo prueba en Node 22.
