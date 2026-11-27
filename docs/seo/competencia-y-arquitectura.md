# SEO: competencia y arquitectura de información

> Estratega SEO de competencia y arquitectura · 2026-11-27. Complementa la investigación de demanda de palabras clave (otro agente).
> Método: 7 búsquedas en español/inglés con WebSearch (resultados de EE. UU.) y 3 lecturas de sitios. **No hay datos de volumen ni de posición propia**: nada aquí es una métrica; lo observado lleva su URL. Lo que es criterio mío va marcado "(criterio)".
> Límite honesto: WebSearch no devuelve el orden exacto de la SERP ni la SERP personalizada de un usuario hispano en EE. UU.; trátese como muestra de quién aparece, no como ranking.

## 0. Resumen en 6 líneas

1. Las SERP de intención informativa ("cómo ser más disciplinado", "hábitos de éxito") las ocupan **medios y blogs de contenido genérico** (Excelsior, Semana, Infobae, Emprendedor, Shopify ES). Son listas sin autoridad temática propia: hay hueco para una guía con método y un reto accionable.
2. "Reto de 30 días disciplina" lo ocupan **productos de pago en Hotmart y ebooks**, no un reto gratis con seguimiento. El reto gratis es el hueco más claro y encaja con el embudo de la visión.
3. "Mentalidad alfa" es un término **disputado y de baja calidad** (PDF, Scribd, notas de "5 hábitos de hombres alfa"); además las fuentes lo cuestionan. La marca ya lo reencuadra ("dominarte a ti"): ahí hay un ángulo propio, pero es un término de marca/definición, no de volumen.
4. En ropa/objetos con mensaje compiten **marketplaces (Etsy, Zazzle, Gelato)** y marcas fitness (Rogue, Gymshark). Ninguno de los observados une la prenda a un sistema de disciplina.
5. El repo hoy es **un sitio de tienda** (home + 2 productos + políticas). Ni la membresía, ni el reto, ni los pilares, ni el contenido existen como URLs: no hay nada que rankee para los temas de la marca salvo la home.
6. El SEO técnico base está bien hecho (JSON-LD de Product/FAQ/Breadcrumb, canonical por página, staging cerrado). Los riesgos reales son: renderizado 100% dinámico por `connection()`, titles/copy que dicen "tazas y vasos" mientras la marca es otra cosa, y canonical heredado "/" en el layout.

---

## 1. Mapa de competidores

Cada fila: qué observé (con URL) → qué hacen bien → dónde dejan hueco.

### 1.1 Medios y blogs de contenido en español (SERP informativa)
- **Excelsior (MX)** "Cómo ser más disciplinado: cinco estrategias respaldadas por Harvard" — https://www.excelsior.com.mx/estilo-de-vida/ser-mas-disciplinado-cinco-estrategias-respaldadas-harvard
- **Univision** — https://www.univision.com/estilo-de-vida/bienestar/5-trucos-que-te-ayudaran-a-ser-una-persona-mas-disciplinada
- **Emprendedor.com** — https://emprendedor.com/10-tips-para-volverte-un-sensei-de-la-disciplina/ y https://emprendedor.com/10-habitos-basicos-de-las-personas-exitosas/
- **Shopify ES** (blog de marca de e-commerce) — https://www.shopify.com/es/blog/11-habitos-de-las-personas-exitosas-que-los-duenos-de-pequenos-negocios-deben-adoptar
- **Semana, Infobae, Forbes Argentina, Portafolio** en "hábitos de personas exitosas" (URLs en la búsqueda; formato lista numerada).
- Hacen bien: autoridad de dominio, lista numerada con H2 por ítem, titulares con cifra. Univision tiene audiencia hispana de EE. UU.
- Hueco: la propia búsqueda anota que los "consejos de Harvard" vienen vía prensa, no de fuente académica. Son listas que **no te llevan a hacer nada**. Nosotros: guía + reto + registro diario (acción, no lectura).
- Nota de nicho: Grupo GEARD (https://grupogeard.com/blog/tips/aprenda-disciplinado/) y Headway (https://makeheadway.com/es/blog/reto-de-33-dias/) son blogs de marca que mezclan contenido con producto; Headway es app de pago con reto de 33 días: el competidor más parecido en intención "reto + hábito".

### 1.2 Retos y programas de pago en español (SERP comercial del reto)
- **Hotmart** (marketplace) con ebooks/retos: "Disciplina en 30 Días" https://hotmart.com/es/marketplace/productos/disciplina-en-30-dias-el-metodo-practico-para-dejar-la-procrastinacion-y-cumplir-tus-objetivos/X103851521D ; "21 días de disciplina - reto en línea para hombres" https://hotmart.com/es/marketplace/productos/21-dias-de-disciplina-reto-en-linea-para-hombres/F79844748J ; "Reto de Autodisciplina en 10 días" https://hotmart.com/es/marketplace/productos/reto-de-autodisciplina-en-10-dias/S71196031U
- Membresías en el mismo canal: Valientes (50 retos al año) https://hotmart.com/es/marketplace/productos/membresia-valientes/I97353727R ; Beyond Reset (comunidad + ruta inicial de 21 días) https://hotmart.com/es/marketplace/productos/beyond-reset/A105812671Y ; Never Give Up (clases en vivo semanales) https://hotmart.com/es/marketplace/productos/never-give-up/H98595426H
- Hacen bien: el reto corto como puerta de entrada (10/21/33 días) y la membresía recurrente alrededor. Valida el modelo de la visión.
- Hueco: son **fichas de marketplace**, sin sitio de marca, sin contenido ni seguimiento visible, y en buena parte para público de España/LatAm. Un reto con página propia, reglas públicas y progreso es diferencial. También: ninguno observado habla del hispano en EE. UU. (chofer de app, doble turno), que es nuestro público.

### 1.3 Referencias en inglés para la estructura (no para copiar el tono)
- **75 Hard (Andy Frisella)** — https://andyfrisella.com/pages/75-hard-info . Observado: title "75 Hard | A Tactical Guide to Winning the War with Yourself"; una sola página larga: aviso, posicionamiento ("no es un reto de fitness, es de fortaleza mental"), historia del fundador, beneficios, prueba social (afirma más de un millón de participantes, sin verificar aquí), "gratis pero cuesta tiempo", formulario, FAQ de objeciones, CTA repetido ~4 veces. **Las reglas se entregan al dar el email** (captura de leads). Hacen bien: un nombre propio y memorable, una sola página destino, lead capture. Hueco: la página retiene el contenido; por eso los resultados orgánicos de "75 Hard rules" los ocupan Cleveland Clinic, Fortune, Rep Fitness, Tom's Guide (https://health.clevelandclinic.org/75-hard-challenge-and-rules, https://fortune.com/well/article/75-hard-challenge-rules-benefits-risks-alternatives, https://repfitness.com/blogs/lifestyle/75-hard-challenge). Lección: **quien publica las reglas abiertas gana la SERP**; quien las encierra la pierde ante terceros. También, la crítica médica aparece en esos resultados: un reto sano debe tener versión "soft" y avisos.
- **Daily Stoic (Ryan Holiday)** — https://dailystoic.com . Observado: 9 ítems de nav (Welcome, Videos, Articles, Podcast, email diario, Store, Membership, Sign in, búsqueda); hubs por categoría (`/category/wisdom/`, entrevistas, perfiles); dos colecciones perennes ("Best Articles" `/most-popular/`, "Best Quotes From The Stoics" `/stoic-quotes/`); **una página pilar "What is Stoicism?"** como entrada; el email aparece 3 veces por página; la tienda es una tarjeta entre teasers; enlaces con UTM por origen. Hallazgos negativos observados: sin schema visible en lo que devolvió la lectura (no puedo afirmar que no exista), anclas "READ MORE" genéricas, posts con URL numérica `/?p=14933`. Hacen bien: un pilar de definición + archivos temáticos + mezcla suave de contenido/venta + email como columna vertebral. Hueco: es filosofía en inglés; nada para hispanos.
- **The Real World (Andrew Tate)** — https://www.jointherealworld.com devolvió 403; **no pude leerlo**. Su estructura (campus por área) viene de `docs/vision-membresia.md`, no de mi observación. Para la SERP importa poco: su valor para la marca es de referencia de producto; tono y asociación se descartan (decisión ya tomada en la visión).

### 1.4 Ropa/objetos con mensaje
- **Rogue Fitness** (camisetas de lema: "Don't Weaken", "Compete Every Day") — https://www.roguefitness.com/es/rogue-dont-weaken-t-shirt-black-white . Hace bien: cada prenda cuenta una historia (cita de Terry Todd, parte de beneficios a un centro de cultura física). La prenda es un artefacto con significado.
- **Gymshark** colección gráfica es-US — https://www.gymshark.com/es-US/collections/graphic-collection/mens . Hace bien: colecciones por tema, ya localizado a es-US.
- **Etsy / Zazzle / Gelato** (ej. https://www.gelato.com/es/blog/cool-sayings-tshirts ) dominan la cola larga de "camisetas con frases motivacionales". Hueco: diseño genérico, traducido; sin marca ni comunidad.
- Observación (criterio): no competimos por "camisetas motivacionales" (cola genérica, marketplaces con autoridad). Competimos por **marca + sistema**: la ropa/taza es el "uniforme" del reto.

### 1.5 Lo que NO pude medir
Volumen, dificultad, posiciones reales de actitudalfa360.com, backlinks. Eso requiere Search Console/Ahrefs; Search Console se verifica por DNS (TXT de Google en Cloudflare, no en el repo); falta confirmar la propiedad y enviar el sitemap (ver 4, ítem 9).

---

## 2. Arquitectura de URLs propuesta

Principio (industria: Daily Stoic, Headway, Gymshark): **pilares = hubs de tema; reto y membresía = páginas de conversión; guías = contenido que alimenta ambos; tienda = producto de apoyo**. URLs en español, minúsculas, sin acentos, estables.

```
/                         Home: promesa (disciplina + 4 pilares), CTA reto gratis, tienda como bloque
/reto-30-dias             Reto gratis: reglas PÚBLICAS + registro por email (página de conversión #1)
/membresia                El 360 / Miembro $12: qué incluye, escuadras, FAQ
/pilares                  Índice de los 4 pilares (explica el 360)
  /pilares/cuerpo         Hub: guías de cuerpo + producto + CTA reto
  /pilares/mente
  /pilares/dinero
  /pilares/palabra        (la copy actual dice "Carácter"; ver 4, ítem 5)
/guias                    Índice de guías
  /guias/como-ser-mas-disciplinado
  /guias/habitos-de-exito
  /guias/que-es-la-mentalidad-alfa        (definición propia, "dominarte a ti")
  /guias/rutina-para-quien-trabaja-doble-turno   (público: chofer/repartidor, ángulo propio)
/tienda                   Índice de producto (hoy sólo anclas /#tienda)
  /productos/[slug]       (YA EXISTE: taza, vaso)
/cursos                   Futuro: NO publicar hasta que exista el primer curso
/campus/[pilar]           Futuro, detrás de login (noindex); su escaparate público = /pilares/[pilar]
/politicas  /contacto  /sobre-nosotros   (E-E-A-T: quién está detrás; hoy sólo /politicas)
```

Por qué (cómo lo hace la industria → qué hacemos):
- **Pilar como hub** — Daily Stoic usa "What is Stoicism?" como página de entrada y categorías como archivos → nosotros usamos los 4 pilares (ya son el concepto central de la marca) como hubs; hoy son anclas `/#pilares` (`src/components/site-header.tsx:5-10`), es decir **no indexables como páginas propias**.
- **Reto abierto** — 75 Hard encierra las reglas y deja la SERP a terceros → nosotros publicamos reglas y plantilla completas en `/reto-30-dias` y pedimos el email para el **registro diario y las escuadras**, no para desbloquear el texto. Así rankeamos por "reto de 30 días disciplina" y capturamos.
- **Guías cortas con un solo trabajo** — los medios hacen listas "5 consejos" sin acción → cada guía termina con el paso concreto del reto.
- **Tienda como consecuencia, no como cabecera** — Daily Stoic pone la tienda como tarjeta entre contenido → la home actual abre con tienda ("Colección 01"); invertimos el orden cuando exista el reto.

### Enlazado interno (reglas)
1. Cada guía enlaza **hacia arriba** a su pilar (anchor descriptivo: "pilar Cuerpo", no "ver más") y **hacia el reto**.
2. Cada pilar enlaza a sus 3-5 guías, al reto y a **un** producto relacionado (frase de la pieza = frase del pilar).
3. `/reto-30-dias` enlaza a los 4 pilares (qué se registra cada día) y a `/membresia` (siguiente paso).
4. Producto enlaza a su pilar y a la guía que cuenta el mensaje de su frase (hoy: "Completa el equipo" sólo enlaza otros productos, `src/app/productos/[slug]/page.tsx:95`).
5. Header: Reto · Pilares · Guías · Tienda · Membresía (sustituye las anclas). Footer repite todo + políticas.
6. Migas (`BreadcrumbList`) en todo lo que sea más profundo que 1 nivel; ya existe el constructor.
7. Anchors con palabra clave natural, nunca "READ MORE" (defecto observado en Daily Stoic).

---

## 3. Patrones on-page por tipo de página

Formato: title / H1 / schema / bloques. Titles ≤ ~60 caracteres (criterio de buena práctica; la plantilla `%s | Actitud Alfa 360` del layout añade ~19, así que el segmento propio debe ser ≤ ~40).

| Página | Title (segmento) | H1 | Schema | Bloques |
|---|---|---|---|---|
| Home | "Disciplina en 4 pilares: reto de 30 días y tienda" | Una promesa con el beneficio, no sólo la marca | `Organization` + `WebSite` (ya) | Reto gratis arriba, 4 pilares con enlaces reales, prueba social cuando exista, tienda, FAQ |
| Reto | "Reto de 30 días de disciplina (gratis)" | "Reto de 30 días: cuerpo, mente, dinero y palabra" | `Event`/`Course` NO (no encaja). Usar `WebPage` + `HowTo` sólo si hay pasos visibles reales; `FAQPage` con cautela (ver nota) | Reglas, versión soft/estándar, qué pasa si fallas (como 75 Hard), plantilla, formulario, FAQ, aviso de salud |
| Membresía | "Membresía El 360: rendición de cuentas diaria" | "Que alguien te pregunte cada día: ¿cumpliste hoy?" | `Product`+`Offer` (precio recurrente) sólo cuando se pueda comprar; antes, `WebPage` | Qué incluye por nivel, escuadras, garantía/cancelación clara, FAQ, comparación con "grupo de chat" |
| Pilar | "Pilar Cuerpo: entrena aunque no tengas ganas" | "Cuerpo: entrena" | `CollectionPage` + `BreadcrumbList` | Definición del pilar, guías, mini-reto del pilar, producto afín |
| Guía | Pregunta literal ("Cómo ser más disciplinado: método de 4 pasos") | La misma pregunta | `Article` (autor persona real, `datePublished`/`dateModified`) + `BreadcrumbList` | Respuesta en las primeras 2-3 líneas, pasos, ejemplo para quien trabaja doble turno, CTA al reto, autor y fecha |
| Producto | (ya existe; ver copy.json) | Nombre + frase | `Product` + `Offer` + envío + devolución (ya, `src/lib/structured-data.ts`) | Añadir: enlace al pilar y a la guía de la frase; reseñas sólo si son reales |
| Políticas / Sobre nosotros | "Envíos y devoluciones" / "Quiénes somos" | — | `AboutPage` / `WebPage` | Entidad legal (Tech Build Dreams LLC), contacto, dirección si es pública |

Notas:
- **FAQ**: ya se emite `FAQPage` en la home (`src/app/page.tsx:21`) y en productos. Desde 2023 Google limita el resultado enriquecido de FAQ a sitios gubernamentales y de salud (conocimiento general del autor; confirmar en la documentación de Google antes de apostar a ello). **Mantener el marcado es inocuo, pero no cuenta como ganancia SEO**; su valor real es la lectura por motores de IA. No invertir esfuerzo extra aquí.
- **Autor y confianza (E-E-A-T)**: las guías sobre salud/dinero no pueden ir sin autor ni fuente. Si se cita "Harvard", citar el estudio, no la nota de prensa (defecto observado en los resultados de Excelsior/Plano Informativo).
- **Ropa**: copy de producto con medidas, material, tiempo de producción (ya está) + la historia de la frase (Rogue lo hace).

---

## 4. Hallazgos técnicos (repo actual) por prioridad

**P1 = corregir antes de lanzar contenido; P2 = antes de escalar; P3 = mejora.**

| # | Prio | Hallazgo | Evidencia | Qué hacer y por qué |
|---|---|---|---|---|
| 1 | P1 | **Todas las páginas se renderizan dinámicamente por petición** (`await connection()` en el layout raíz, para el nonce del CSP). Sin HTML estático/CDN: TTFB y coste de función por cada visita, incluidas las de bots. | `src/app/layout.tsx:53-54` | Industria (Vercel/Next): contenido editorial se sirve estático/ISR desde CDN. Evaluar CSP basado en hashes o CSP sin nonce sólo para rutas de contenido (guías, pilares), dejando dinámico lo que lo necesite. Decisión de seguridad: la toma el CTO. Con tráfico orgánico es coste y velocidad (Core Web Vitals). |
| 2 | P1 | **Canonical "/" heredado del layout**: cualquier ruta que no defina el suyo (404, `/gracias`, futuras páginas olvidadas) declara canonical a la home. Hoy lo corrigen `productos/[slug]` (l.31) y `politicas` (l.10). | `src/app/layout.tsx:37` | Quitar `alternates.canonical` del layout y exigirlo por página (test que falle si una ruta indexable no lo define). Un canonical equivocado desindexa páginas. |
| 3 | P1 | **El mensaje del sitio es "tazas y vasos"**: title y description de la home y el `llms.txt` describen una tienda de dos productos; no mencionan reto, membresía ni disciplina. Para consultas de tema (disciplina, hábitos) la home no tiene señal. | `src/content/copy.json` (home.title/description); `public/llms.txt:1-10` | Reescribir title/description cuando exista `/reto-30-dias`. No prometer en metadatos algo que aún no existe. |
| 4 | P1 | **No hay páginas para los temas** (pilares, reto, guías). Sitemap = home + productos + políticas. Los 4 pilares son anclas. | `src/app/sitemap.ts:8-16`; `src/components/site-header.tsx:5-10` | Ver sección 2. Orden sugerido: `/reto-30-dias` → 4 pilares → 3 guías → `/membresia`. |
| 5 | P2 | **Incoherencia de nombres del cuarto pilar**: la visión dice *palabra*; la home y `llms.txt` dicen *Carácter (cumple)*. Un LLM o un usuario verán dos marcas. | `docs/vision-membresia.md` (niveles); `public/llms.txt:3`; FAQ en `copy.json` | Decidir un solo nombre (decisión de marca del CEO) y unificar copy, schema y llms.txt. |
| 6 | P2 | **`lastModified: new Date()` en cada petición del sitemap**: todas las URLs aparecen "modificadas hoy" siempre; Google aprende a ignorar la señal. Además `changeFrequency`/`priority` son campos que Google ignora. | `src/app/sitemap.ts:7-16` | Usar fecha real (git/contenido). Quitar priority/changefreq (ruido). |
| 7 | P2 | **`Organization` sin `sameAs`** (redes) ni dirección/identidad verificable; `logo` apunta a un PNG de icono 512 (válido, pero cuadrado). | `src/lib/structured-data.ts:33-43` | Añadir `sameAs` con los perfiles reales cuando existan; ayuda a desambiguar la entidad "Actitud Alfa 360" (el 360 y "alfa" son términos comunes). |
| 8 | P2 | **`lang="es"` vs `inLanguage: 'es-US'` vs `locale: 'es_US'`**: tres valores para el mismo idioma. No es error grave, pero conviene uno solo. | `src/app/layout.tsx:56`; `src/lib/structured-data.ts:46`; `src/config/site.ts:7-8` | Unificar en `es-US` (HTML `lang="es-US"`). **No añadir hreflang**: hay un solo idioma y un solo mercado; hreflang sin alternativa es ruido. |
| 9 | P2 | **Search Console sin sitemap enviado**: el dominio se verifica por DNS (el TXT de Google ya está en Cloudflare, corrección del CTO 2026-11-27), no por metaetiqueta en `src/`. Falta confirmar la propiedad de dominio, enviar `/sitemap.xml` tras el primer deploy a `main` y añadir Bing Webmaster. | `docs/plan-migracion-vercel.md` (paso 4) | Es el único origen de datos reales de posición. Gratis. |
| 10 | P3 | `robots.ts` bloquea `/gracias` con Disallow **y** la página usa `noindex`: si el robot no puede rastrearla, nunca verá el `noindex`. Al no estar enlazada es inocuo hoy. | `src/app/robots.ts:9`; `src/app/gracias/page.tsx:10` | Quitar `/gracias` del Disallow y dejar sólo `noindex`. Mantener `/api/` bloqueado. |
| 11 | P3 | `llms.txt` es correcto en forma (título, resumen, listas con enlace) pero **no incluye** reto, pilares ni guías; y no es un estándar que Google use (criterio: valor bajo, coste cero). | `public/llms.txt` | Actualizar cuando existan las páginas; no dedicarle más tiempo. |
| 12 | P3 | Bien hecho, conservar: staging con `noindex` + `Disallow: /` (`src/app/robots.ts:7`, `layout.tsx:46`); JSON-LD con `@graph`, `Product`, envío y devolución (`structured-data.ts`); `metadataBase`, OG 1200x630 (`layout.tsx:33,42`); `www` → apex 301 (`next.config.ts`); fuentes con `display: swap`; imágenes en AVIF/WebP. | — | No tocar. |

Nota sobre cabeceras de seguridad (`next.config.ts`): correctas y sin conflicto con SEO.

---

## 5. Lo que NO hacemos

- **No clonamos el tono ni la marca asociada de The Real World**; sólo la estructura (decisión ya en `docs/vision-membresia.md`).
- **No competimos por "camisetas motivacionales" genéricas**: dominan Etsy/Zazzle/Gelato; es una cola sin marca.
- **No encerramos las reglas del reto tras un formulario** (error de 75 Hard: terceros ocupan la SERP con sus reglas).
- **No publicamos 50 artículos de lista "10 hábitos..."**: ya los hacen medios con más autoridad (Infobae, Semana, Excelsior). 3-5 guías con método y un paso accionable.
- **No inventamos reseñas, cifras de participantes ni "estudios de Harvard"**; sin prueba social real, no se muestra. (Requisito además de confianza: 75 Hard afirma "más de un millón" sin evidencia en la página.)
- **No usamos "mentalidad alfa" como gancho de volumen**: término disputado y mal posicionado; se usa como definición propia dentro de una guía.
- **No añadimos hreflang ni versión en inglés** mientras sea un solo idioma y mercado.
- **No publicamos `/cursos` ni `/campus` vacíos**: páginas sin contenido son thin content. Aparecen con el primer curso.
- **No indexamos nada detrás de login** (campus, registro diario, escuadras): `noindex` + fuera del sitemap.
- **No invertimos en `FAQPage` como táctica de rich results** (ver nota en sección 3).
- **No contratamos herramientas SEO de pago hasta tener Search Console con datos**; primero medir con lo gratis.

---

## 6. Primeros pasos sugeridos (orden)

1. Search Console + sitemap enviado (hallazgo 9). Sin esto no se mide nada.
2. Quitar canonical heredado y poner test de "toda ruta indexable declara canonical" (hallazgo 2) — TDD, la prueba va primero.
3. Decidir nombre del 4.º pilar (hallazgo 5) y estrategia de render/CSP para contenido (hallazgo 1).
4. Construir `/reto-30-dias` con reglas abiertas; luego los 4 pilares; luego 3 guías.
5. Reescribir title/description de la home y `llms.txt` al salir el reto.

Fuentes de las búsquedas (consultas): "cómo ser más disciplinado", "reto de 30 días disciplina", "mentalidad alfa qué es", "ropa motivacional hombre camisetas mentalidad", "hábitos de éxito personas exitosas lista", "75 Hard challenge rules", "comunidad de desarrollo personal en español membresía hábitos". Lecturas: dailystoic.com, andyfrisella.com/pages/75-hard-info (jointherealworld.com: 403, no leído).
