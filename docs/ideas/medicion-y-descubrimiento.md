# Medición, conversión y descubrimiento (propuesta del CTO, 2026-11-28)

> Pedido de Luis: GA4 «como en los otros sistemas», saber qué hace el usuario y mejorar, decirlo claro en la
> política, las mejores formas de conversión, datos organizados que den valor a la empresa, y que nos encuentren
> los LLM y la búsqueda social. **Estado: paso 1 (consentimiento + GA4) construido en la rama `medicion-consentimiento` (ver «Paso 1: estado» al final).** Va en su propia sesión.

## 1. Postura (lo que cambio del pedido, y por qué)

- **No «trackear todo»: medir lo que contesta preguntas.** Así lo hacen Shopify, Airbnb y Duolingo: una lista
  cerrada de eventos con nombre estándar, no un aspirador. Lo que no contesta una pregunta cuesta dinero, ensucia
  reportes y es riesgo legal sin valor.
- **El valor de empresa está en los datos propios, no en el volumen:** lista de correo con doble confirmación,
  historial de compras, cohortes del reto, retención. Eso se tasa en una venta o una ronda; un dump de clics, no.
- **Salud = línea roja.** El reto y la idea del ciclo son datos de salud (Washington *My Health My Data*, Nevada,
  Connecticut). Nada de salud ni del ciclo sale hacia píxeles de anuncios, nunca. Se mide «completó el día 7»,
  no «qué síntoma reportó».
- **La verdad del dinero vive en el servidor** (regla global): el webhook de Stripe ya existe; desde ahí salen las
  conversiones a GA4 y Meta (server-side), no desde el navegador, que bloquean el 30-40 % de los usuarios.

## 2. Medición (industria: GA4 + Consent Mode v2 + conversiones server-side)

1. **GA4 + Search Console + Bing Webmaster Tools** (gratis). Exportación GA4 → BigQuery (sandbox gratis).
2. **Consent Mode v2 + banner**, rechazar tan fácil como aceptar. Respetar **GPC** (la señal del navegador que
   exige California). Sin consentimiento, GA4 manda pings sin cookies (modelado).
3. **Eventos (nombres estándar GA4):** `view_item`, `add_to_cart` (kit), `begin_checkout`, `purchase`
   (**solo server-side**, desde el webhook, vía Measurement Protocol, con `transaction_id` = pedido: sin dobles),
   `sign_up` (reto), `generate_lead`, y propios: `reto_day_completed` (día, sin contenido de salud).
   Todo por UN wrapper con sink inyectable (TDD, como dice `~/.claude/docs/medicion-de-producto.md`).
4. **Meta Pixel + Conversions API** (server-side, desde el mismo webhook, deduplicado con `event_id`) solo cuando
   vayamos a pagar anuncios en Meta. Antes, no: es «compartir datos» en sentido CCPA y obliga a más cosas.
5. **Postgres** guarda lo que es del negocio: pedidos (ya), suscriptores y progreso del reto (F3), UTM/origen de la
   primera visita en el pedido y en el suscriptor. **No** cada clic: eso va a GA4/BigQuery (Supabase cobra por disco).
6. Coste: 0 $ hasta mucho volumen. GA4 y BigQuery sandbox gratis; Measurement Protocol y CAPI gratis.

## 3. Política (industria: Patagonia, Allbirds, Glossier — clara y por capas)

- Sección «Qué medimos y por qué», en lenguaje llano: herramienta, dato, para qué, cuánto se guarda, cómo decir no.
- Si se activa Meta: enlace «No vender ni compartir mi información» (CCPA/CPRA) y respeto de GPC.
- Explícito: «los datos de tu reto y tu salud no se usan para anuncios ni se comparten».
- Un abogado revisa antes de producción (no lo firma el CTO).

## 4. Que nos encuentren los LLM y la búsqueda social (2026)

Lo que ya funciona, por orden de impacto:

1. **Google Merchant Center (listados gratis)**: el catálogo alimenta Shopping, Google Lens y AI Mode. Mayor
   retorno para producto físico.
2. **Datos estructurados** completos: `Product` + `Offer` (precio, envío, devoluciones), `Organization`,
   `FAQPage`, `HowTo` del reto. Los LLM citan lo que pueden leer como hecho.
3. **robots.txt**: permitir los bots de **búsqueda** de IA (OAI-SearchBot, ChatGPT-User, PerplexityBot,
   Claude-SearchBot, Google-Extended según decidamos). Bing Webmaster es lo que alimenta ChatGPT search y Copilot.
4. **Contenido que contesta preguntas** («cómo hacer un reto de 30 días», «disciplina diaria»): respuestas cortas
   arriba, con fecha y autor (E-E-A-T). Es lo que los LLM extraen.
5. **Búsqueda social**: TikTok, Instagram, YouTube Shorts y Pinterest son buscadores. Palabra clave en el texto
   hablado, el subtítulo y la descripción; Pinterest con *product pins* desde el catálogo.
6. `llms.txt`: barato, evidencia débil de que se use. Se pone, sin esperar nada.
7. Medir: tráfico desde `chatgpt.com`, `perplexity.ai`, etc. como canal propio en GA4.

## 5. Orden propuesto (cada uno, TDD y su propia sesión)

1. Consentimiento + GA4 + Search Console/Bing (base legal y medición).
2. `purchase` server-side desde el webhook (Measurement Protocol) + UTM en el pedido.
3. Datos estructurados + robots + Merchant Center.
4. Política actualizada → abogado.
5. Meta CAPI: solo el día que haya presupuesto de anuncios.

## Decisiones (Luis, 2026-11-28)

- **Orden de §5: aprobado.** Primero 1 (consentimiento + GA4 + Search Console/Bing) y 2 (`purchase` server-side).
- **Sin anuncios pagados**, solo contenido orgánico. Se aplaza Meta Pixel/CAPI (§2.4 y §5.5) y el enlace CCPA
  «No vender ni compartir». Si un día hay presupuesto de anuncios, se reabre: cambia la política.
- **Banner solo para EEE/Reino Unido/Suiza** (país por la cabecera de geo de Vercel). En EE. UU.: sin banner,
  GA4 con Google Signals y personalización de anuncios **apagadas**, GPC respetado (con GPC: `analytics_storage`
  denied). Sustituye al «banner para todos» de §2.2.
- **Corrección del CTO a §2.3: `reto_day_completed` NO va a GA4.** El avance del reto vive en Postgres (F3) y las
  cohortes salen de ahí. GA4 recibe solo `sign_up` del reto, sin nada de salud. Así lo promete la política.
- **Bots de IA: solo búsqueda** (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot). GPTBot y
  Google-Extended bloqueados por ahora.
- **Reto solo para mayores de 18** (dicho en la política y junto al formulario; sin casilla).
- **La promesa de Carácter no se guarda** (se escribe para uno mismo). F3 no tiene campo de texto libre.
- Abierto para el abogado: si la ley de Washington (*My Health My Data*) cubre unas casillas de ejercicio. Mientras,
  se diseña como si las cubriera.

## Paso 1: estado (2026-11-28)

Rama `medicion-consentimiento` (PR a `develop`). Construido con TDD, revisado por un QA de medición y un Rompedor de
consentimiento; todo lo que encontraron está arreglado y con test (rojo → verde). Probado en Chrome con la CSP real.

**Qué hace el código**
- Banner solo EEE/RU/CH + territorios UE con ISO propio + GI/JE/GG/IM (`src/domain/consent.ts`). Sin país ⇒ banner.
- **Modo básico**, no avanzado: sin permiso no sale NINGUNA petición a Google (desviación del §2.2 «pings sin cookies»:
  el modelado necesita ~1000 usuarios/día, no compensa el riesgo legal). GPC ⇒ nada, en cualquier región.
- Retirar el permiso: `consent update denied` + `ga-disable-<ID>` + borra `_ga` + recarga (gtag.js sale de memoria).
- Eventos (`src/lib/analytics.ts`): `page_view` propio con URL saneada (solo ruta + `utm_*`; el `cs_…` de `/gracias`
  NO sale), `view_item`, `begin_checkout` (solo si el pago se abre), `sign_up` (método + origen, nunca el correo).
- Solo mide `NEXT_PUBLIC_APP_ENV=production` con `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Un ID mal escrito tumba la build.
- Política: borrador «Qué medimos y por qué» en `/politicas#medicion` (copy.json → `politicas.medicion`).

**Runbook de consola (Luis). El texto de la política depende de 2, 3, 4 y 5: sin ellos es falso.**
1. GA4: crear propiedad + flujo web `actitudalfa360.com` → pasarme el `G-…`. Yo lo pongo en Vercel (solo Production).
2. Admin → Recopilación de datos → **Conservación: 14 meses** (por defecto son 2).
3. Flujo web → **Medición mejorada: APAGADA entera.** «Cambios de página por historial» mandaría la URL con query
   (y duplicaría nuestro `page_view`); scroll, clics salientes, formularios, búsqueda y descargas no están en la política.
4. Admin → **Google Signals apagado** y personalización de anuncios apagada en todas las regiones.
5. Configuración de la cuenta → **Compartir datos: todo desmarcado** (la política dice que no se comparten para publicidad).
6. Flujo web → Redacción de datos: activar correo y añadir el parámetro `pedido` (cinturón además de tirantes).
7. Vincular BigQuery (sandbox, exportación diaria) + alerta de presupuesto en GCP.
8. Search Console: propiedad de **dominio** `actitudalfa360.com` → pasarme el TXT → yo lo pongo en el DNS de Vercel.
   Enviar `https://actitudalfa360.com/sitemap.xml`.
9. Bing Webmaster Tools: «Importar desde Google Search Console».

**Pendiente**
- Luis aprueba el texto de `#medicion` → abogado (junto con el resto de la política, paso 4).
- Humo en producción (cuando F3 levante la compuerta): Tiempo real de GA4 ve `page_view` sin query; con `Sec-GPC: 1`
  no sale nada. Staging nunca mide, así que esto solo se puede comprobar en producción.
- Paso 2: `purchase` server-side desde el webhook (Measurement Protocol) + UTM en el pedido.

**Deliberadamente NO hecho**
- Sin enlace «decir no» en EE. UU. aparte de GPC (decisión de Luis; la política no promete otro).
- Sin `add_to_cart`: no hay carrito; el kit va directo al pago.
- Sin modo avanzado / modelado (ver arriba).
