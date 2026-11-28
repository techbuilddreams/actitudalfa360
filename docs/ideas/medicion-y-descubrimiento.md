# Medición, conversión y descubrimiento (propuesta del CTO, 2026-11-28)

> Pedido de Luis: GA4 «como en los otros sistemas», saber qué hace el usuario y mejorar, decirlo claro en la
> política, las mejores formas de conversión, datos organizados que den valor a la empresa, y que nos encuentren
> los LLM y la búsqueda social. **Estado: propuesta, sin aprobar. Nada construido.** Va en su propia sesión.

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

## Decisiones para Luis

- ¿Aprobado el orden de §5? Recomendación: sí, empezar por 1-2.
- ¿Habrá anuncios pagados en Meta/TikTok en los próximos 3 meses? Si no, el punto 5 se aplaza y la política
  es más simple.
- ¿Permitimos el entrenamiento de IA (GPTBot, Google-Extended) o solo la búsqueda? Recomendación: solo búsqueda
  por ahora; se puede abrir después.
