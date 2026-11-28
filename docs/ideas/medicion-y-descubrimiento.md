# Medición, conversión y descubrimiento (propuesta del CTO, 2026-11-28)

> Pedido de Luis: GA4 «como en los otros sistemas», saber qué hace el usuario y mejorar, decirlo claro en la
> política, las mejores formas de conversión, datos organizados que den valor a la empresa, y que nos encuentren
> los LLM y la búsqueda social. **Estado: pasos 1 y 2 mergeados (PR #10, #11); paso 3 en la rama `medicion-seo` (ver «Paso 3: estado»).** Va en su propia sesión.

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
- ~~Luis aprueba el texto de `#medicion`~~ aprobado 2026-11-28; el paso 2 le añade dos frases (ver abajo). → abogado (paso 4).
- Humo en producción (cuando F3 levante la compuerta): Tiempo real de GA4 ve `page_view` sin query; con `Sec-GPC: 1`
  no sale nada. Staging nunca mide, así que esto solo se puede comprobar en producción.
- Paso 2: ver «Paso 2: estado».

**Deliberadamente NO hecho**
- Sin enlace «decir no» en EE. UU. aparte de GPC (decisión de Luis; la política no promete otro).
- Sin `add_to_cart`: no hay carrito; el kit va directo al pago.
- Sin modo avanzado / modelado (ver arriba).

## Paso 2: estado (2026-11-28)

Rama `medicion-purchase` (PR a `develop`). TDD; revisado por el QA de medición y el Rompedor de atribución. Sus dos P1
(emoji en el carácter 100 ⇒ 502 de Stripe durante 90 días; el servidor no comprobaba el permiso) y los P2 están
arreglados, con test rojo → verde.

**Qué hace el código**
- El navegador, SOLO con la medición encendida, manda `attribution` al abrir el pago: client_id (`_ga`), session_id
  (`_ga_<ID>` de nuestra propiedad) y la campaña de la primera visita (localStorage `aa360_campaign`, 90 días; se borra
  al retirar el permiso). El servidor la descarta si NO ve permiso (país + GPC + cookie, `consentOfRequest`).
- Viaja en la metadata de la sesión de Stripe (no en el PaymentIntent). El webhook la valida otra vez.
- UTM en columnas `orders.utm_*` (migración 0002, solo expansión). Los IDs de GA4 no van a Postgres.
- `purchase` por Measurement Protocol solo en el pedido NUEVO con client_id, dentro de `after`, programado antes del
  correo de pedido. `transaction_id` = AA360-N; `value` = subtotal − descuento (sin desglose: el total); envío e impuesto
  aparte; anuncios DENIED; sin contacto. Fallo ⇒ log `analytics_purchase_failed`, sin reintento (decisión: una métrica
  gratis no justifica una cola).
- Producción con `NEXT_PUBLIC_GA_MEASUREMENT_ID` y sin `GA_API_SECRET` tumba la build.

**Runbook (Luis), además del del paso 1**
10. GA4 → flujo web → «Secretos de la API de Measurement Protocol» → crear → pasarme el valor. Yo lo pongo en Vercel
    (`GA_API_SECRET`, solo Production), junto con el `G-…`.
11. Humo tras levantar la compuerta de F3: una compra real con la medición encendida ⇒ en GA4 Tiempo real aparece
    `purchase` con `AA360-N`; la fila tiene `utm_*`. Validar una vez el payload contra `/debug/mp/collect` (GA4 responde
    2xx aunque el payload sea inválido). Comprobar que la observabilidad de Vercel no guarda la query de salida (lleva
    el `api_secret`, como exige Google).

**Pendiente**
- ~~Luis aprueba las dos frases nuevas de `#medicion`~~ aprobadas 2026-11-28.
- ~~Merge del PR → `develop`~~ hecho (#11, ff8d8ed).

**Deliberadamente NO hecho**
- Sin reintento ni cola del `purchase`: si GA4 falla o la función muere justo tras guardar el pedido, esa compra no llega
  a GA4 (el pedido sí está en Postgres, que es la verdad del dinero).
- En la UE, si alguien llega con UTM, navega y acepta en otra página, esa campaña no se guarda (GA4 en modo básico
  pierde lo mismo).
- Un pago empezado con permiso y completado tras retirarlo (la pestaña de Stripe ya abierta) se mide.
- `ga_cid`/`utm_*` quedan en la metadata de la sesión de Stripe (lo dice la política); no se borran tras el webhook.

## Paso 3: estado (2026-11-28)

Rama `medicion-seo` (PR a `develop`). TDD; construido por el Especialista en SEO, revisado por el QA de Merchant (build +
`next start` + curl + 8 mutaciones) y por el Rompedor de feed en dos rondas. Tests nuevos en `robots-policy`,
`structured-data`, `merchant-feed`, `llms-txt` y `politicas-page`.

**Qué hace el código**
- **robots.txt** (`src/lib/robots-policy.ts`, pura): `*` rastrea todo menos `/api/` y `/gracias`. Bots de **búsqueda** de IA
  permitidos de forma explícita (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot,
  Claude-User) y con los mismos `disallow` repetidos (un grupo propio ignora a `*`). Bots de **entrenamiento** cerrados
  (GPTBot, Google-Extended, ClaudeBot, CCBot, Applebot-Extended, meta-externalagent, Bytespider, anthropic-ai, Claude-Web,
  cohere-training-data-crawler, AI2Bot). Amazonbot y Diffbot no: uso mixto. Staging: todo cerrado.
  **Decisión pendiente de Luis:** bloquear `Google-Extended` también saca el sitio del grounding de Gemini Apps y Vertex AI
  (no afecta a Google Search ni a AI Overviews). Hoy está bloqueado; es una línea en `robots-policy.ts`.
- **JSON-LD** (`src/lib/structured-data.ts`): `Product`/`Offer` ahora con `material` y `color` (campos opcionales nuevos del dominio, rellenos en el catálogo).
  `Organization` con `legalName` y `PostalAddress` (`site.postalAddress` es un objeto; el pie lo formatea con
  `formatPostalAddress`; `null` ⇒ se omite). Sin `parentOrganization` (contradecía `legalName`). Sin `priceValidUntil`
  (opcional; chocaba con «precios pueden cambiar sin aviso»).
  `/reto-30-dias` emite `FAQPage` (desde 2023 Google no da resultado enriquecido por FAQ: sirve para los LLM). Devolución sigue en `MerchantReturnNotPermitted` (hecho a pedido).
- **Feed** `GET /merchant-feed.xml` (`src/lib/merchant-feed.ts`, pura): RSS 2.0 con `g:`; un item por producto, mismo
  catálogo y mismas constantes que el JSON-LD (test de paridad precio/disponibilidad/envío/plazos). Envío en un
  `g:shipping` anidado (país, precio plano, plazos de manejo y tránsito). Staging: 404 + noindex. CDN 1 h.
- **/llms.txt** ahora es un route handler generado del catálogo y `site.ts` (se borró `public/llms.txt`, que decía
  «Nueva York»). También se corrigió `copy.organization.description` (salía en el JSON-LD con «Nueva York»).
- El proxy no toca `/merchant-feed.xml` (igual que `llms.txt`): sin CSP ni nonce en un XML.

**Runbook de consola (Luis)**
1. Merchant Center: crear cuenta (negocio: Tech Build Dreams LLC, dirección de la LLC, país EE. UU.).
2. Reclamar el dominio `actitudalfa360.com`: se verifica con Search Console (ya hay propiedad de dominio, paso 1.8).
3. Envío: tarifa plana igual que la tienda ($8.99 EE. UU., 2–5 días de producción + 3–7 de entrega). Si cambia
   `SHIPPING_FLAT_CENTS`, cambiarla aquí también: el feed lleva el precio, pero la configuración de la cuenta manda
   si difiere.
4. Devoluciones: **no se aceptan devoluciones por cambio de opinión** (hecho a pedido); daño/defecto ⇒ reemplazo o reembolso
   dentro de 30 días. Misma redacción que `/politicas#devoluciones`.
5. Productos → Feeds → nuevo feed principal → «Descarga programada» diaria de `https://actitudalfa360.com/merchant-feed.xml`
   (país EE. UU., idioma español). Activar «listados gratuitos».
6. Diagnóstico de Merchant Center: comprobar que `g:shipping` con plazos de manejo y tránsito no da aviso.
7. Validar: Rich Results Test sobre `/productos/taza-negra-15oz`, `/productos/vaso-termico-20oz` y `/reto-30-dias`; en
   Merchant Center, Diagnóstico del feed (esperar avisos y pasarme los textos).
8. Bing Webmaster: ya importa la propiedad; añadir el sitemap si no está.

**Pendiente**
- Producción está tras la compuerta de F3: robots, feed y llms.txt solo sirven de verdad cuando se levante.
- Comprobar en Merchant Center que Google acepta `google_product_category` en texto (Mugs; Travel Mugs & Tumblers). Si
  la taxonomía cambió, el diagnóstico lo dirá.
- Humo en producción: `curl -I /merchant-feed.xml` (200, `application/xml`), `/robots.txt`, `/llms.txt`.

**Deliberadamente NO hecho**
- Sin `HowTo` (decisión tomada: Google dejó de mostrarlo).
- Sin GTIN/MPN: son productos propios hechos a pedido; `identifier_exists = no`.
- El kit (taza + vaso en un pago) no va en el feed: no es un producto con SKU propio en el catálogo.
- Sin `g:sale_price`, `g:item_group_id` ni variantes: cada producto tiene una sola variante.
- Sin cambiar la política de devoluciones ni ofrecer «devolución gratis»: sería publicidad engañosa para Merchant Center.
- Sin reglas por bot para Googlebot/Bingbot: caen en `*`.

**Ronda 2 (arreglos tras QA y Rompedor)**
- `llms.txt` y `/politicas` comparten frases (`src/lib/policy-facts.ts`: solo EE. UU., plazos, sin devolución por cambio de
  opinión, «dañado, defectuoso o equivocado … dentro de los 30 días siguientes a la entrega»); envío con `shippingNote`;
  estado de la LLC de `site.legalState` (también en `copy.organization.description`). Corchetes de enlaces Markdown escapados.
- El precio ya no está dentro de `seo.description` (feed y JSON-LD heredaban un precio que podía quedar viejo).
- El feed lanza error si un producto tiene más de una variante (la ficha solo vende la 0).
- `escapeXml` quita surrogates sueltos. Tests de valores exactos (país, URL de devoluciones, `DAY`, `seller`, `g:service`,
  sin `g:region`, categoría de Google exacta).

**Ronda 3 (re-ataque del Rompedor)**
- `/politicas#envios` y `#devoluciones` ahora tienen test contra `policyPhrases()` (antes la página podía decir «aceptamos
  devoluciones» con la suite en verde; los tres mutantes del Rompedor mueren).
- `llms.txt` lleva la nota de impuesto si `STRIPE_AUTOMATIC_TAX` (igual que la ficha) y cómo reclamar la garantía
  (`claimHow`: correo, foto y número de pedido), para que un LLM no la presente como automática.
- Nota: `anthropic-ai` y `Claude-Web` son tokens antiguos (Anthropic hoy documenta ClaudeBot, Claude-User, Claude-SearchBot);
  `cohere-training-data-crawler` sin verificar contra docs de Cohere. Bloquearlos no daña nada.
