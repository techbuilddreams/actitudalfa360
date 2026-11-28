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
