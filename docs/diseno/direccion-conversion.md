# Dirección de conversión — Actitud Alfa 360

> Autor: Especialista en UX de conversión (2026-11-27). Ángulo deliberado: **que el sitio venda**,
> sobre todo en el móvil, a un público hispanohablante en EE. UU. El ángulo opuesto (lujo minimalista)
> lo defiende otro especialista; el CTO resuelve. Maqueta: [`maqueta-conversion.html`](maqueta-conversion.html).
>
> Formato de cada decisión: **industria (quién) → qué hacemos → por qué**.
> Las cifras citadas son de memoria de fuentes públicas (Baymard, NN/g, Google, Deloitte):
> están marcadas con la fuente para verificarlas antes de usarlas fuera de este equipo.

---

## 0. Las tres decisiones que más mueven el dinero

1. **El CTA principal del sitio es el Reto 360 gratis (correo), no la tienda ni los $12.**
   El tráfico llega frío desde IG/TikTok. Un desconocido no paga $12/mes en la primera visita; sí deja un
   correo para un reto gratis. La membresía se vende *dentro* del reto (día 7 y día 30), y la tienda vende
   en su propia ficha. Hoy el sitio no tiene **ningún** CTA de captura: cada visita que no compra una taza
   se pierde para siempre.
2. **En la ficha, precio + botón de compra visibles sin hacer scroll en 390 px, y barra de compra fija
   cuando el botón sale de pantalla.** Hoy el botón queda por debajo del pliegue (ver §4, F1).
3. **Un "Kit del día" (taza + vaso) con un solo envío.** Hoy es imposible comprar las dos piezas juntas:
   cada compra abre su propio Stripe Checkout y cobra **dos** envíos de $8.99. La API ya acepta varias
   líneas (`src/domain/cart.ts:6` `MAX_LINES = 10`), así que es un cambio de UI, no de backend.

---

## 1. Jerarquía de CTAs

| Nivel | CTA | Dónde es el principal | Por qué |
|---|---|---|---|
| **1** | **Empieza el reto de 30 días — gratis** (campo de correo, 1 solo campo) | Home, menú, cierre de página, página de gracias | Menor compromiso, mayor volumen; alimenta el embudo de los $12 |
| **2** | **Únete por $12/mes** (Miembro fundador) | Sección de membresía, día 7 y 30 del reto, correo | Es el ingreso recurrente; se vende mejor a quien ya cumplió 7 días |
| **3** | **Comprar / Agregar el kit** | Ficha de producto (allí es el nivel 1) | Compra impulsiva de $25–35; no compite con el reto en la home |

**Industria.** El modelo "reto gratis → pago" es el de Skool (comunidades con *challenge* gratis que
desbloquea el grupo de pago), 75 Hard (programa gratis → app de pago) y Noom/Duolingo (empezar gratis,
pedir el pago después del primer compromiso). El patrón general es el *lead magnet* de cualquier DTC
(Gymshark, Glossier, Huel): un solo campo en la home, porque cada campo extra baja la tasa de envío del
formulario (Baymard y la práctica de formularios: el número de campos es la palanca más fuerte).

**Qué hacemos.**
- Un solo CTA dorado lleno por pantalla. Lo demás es enlace con subrayado o botón fantasma.
  NN/g: cuando dos botones pesan igual, el usuario duda; uno principal y uno secundario visiblemente menor.
- El precio de la membresía **siempre visible** ($12/mes, cancelas cuando quieras). Esconder el precio es
  lo que mata la confianza en membresías (la gente asume trampa). Skool y Patreon muestran el precio en la
  propia tarjeta del nivel.
- **Precio de fundador**: "Los primeros 100 miembros mantienen $12/mes para siempre". Escasez **real**
  (es una decisión de negocio verificable), no un contador falso. Patrón de Skool, Patreon y Kickstarter
  (*early bird*). Decisión de negocio del CEO: si no se va a honrar, no se pone.
- Texto de botones en **verbos y en primera persona del resultado**: "Empiezo el reto", "Quiero el kit".
  Hoy: "Ver la colección", "Descubrir" (`src/components/product-card.tsx:25`) — "Descubrir" es copy de
  lujo que no dice qué pasa al tocar.

**Fase 1 (sin código).** Mientras la membresía viva en Skool, el CTA 2 lleva a Skool. El CTA 1 sigue siendo
nuestro (correo en Supabase/Resend), porque **la lista de correo es el activo que no le pertenece a Skool**.

---

## 2. Home en orden de scroll (390 × ~660 px útiles en Safari iOS)

Referencia de pliegue: un iPhone 13/14/15 en Safari deja ~660 px de alto útil con las barras visibles.
NN/g (2018): ~57 % del tiempo de visualización ocurre en la primera pantalla y ~74 % en las dos primeras.
Lo que no está en esas dos pantallas, para la mayoría, no existe.

| # | Bloque | Qué lleva | Por qué |
|---|---|---|---|
| 0 | Barra superior 56 px | Sello 32 px + nombre corto + botón "Reto gratis" | Hoy mide 76 px (`globals.css:60`) y el único botón dice "Tienda". En móvil, el botón del header es el CTA más tocado después del hero |
| 1 | **Hero (sobre el pliegue)** | Eyebrow "Reto 360 · 30 días · Gratis" → H1 "No es dominar a nadie. Es dominarte a ti." → 1 línea de qué es → **campo de correo + botón** → microtexto de confianza ("Sin tarjeta. Te sales cuando quieras.") | Prueba de 5 segundos (NN/g): en el hero tiene que entenderse **qué es, para quién y qué hago ahora**. Hoy el H1 es el eslogan (`page.tsx:27-28`), que es buena marca pero no dice qué se ofrece |
| 2 | Sello + 4 verbos | Sello con el anillo rotando (marca), 4 pilares en una fila: Entrena · Lee · Produce · Cumple | La marca y el aire Illuminati van aquí, a 72–120 px, no ocupando 220 px por encima del CTA |
| 3 | Cómo funciona (3 pasos) | 1. Registras tus 4 pilares cada día (30 s). 2. Tu escuadra de 5 lo ve. 3. Cumples 30 días. | Reduce la incertidumbre de "¿qué tengo que hacer?". Patrón de Duolingo/Strava en su página de inicio |
| 4 | Vista del registro 360 | Maqueta del "¿Cumpliste hoy?" con 4 casillas y la puntuación | El diferenciador (visión, §Diferenciador) tiene que *verse*. Mostrar el producto, no describirlo |
| 5 | Membresía | Tarjeta única: **$12/mes**, lista de lo que incluye, "Precio de fundador", botón | Una sola opción (visión: "solo el nivel de $12"). Sin tabla de 3 niveles hasta que existan |
| 6 | Tienda | 2 tarjetas + **Kit del día** con precio y botón directo | Precio visible en la tarjeta (ya está, bien) y botón explícito |
| 7 | Fundador | Foto real de Luis, 3 líneas, firma | Prueba social cuando no hay reseñas (§3) |
| 8 | Garantías | Pago seguro Stripe/Apple Pay, reemplazo por daño 30 días, envío EE. UU. | Baymard: la falta de confianza en el pago está entre las primeras causas de abandono |
| 9 | Preguntas | 5 preguntas, la primera "¿Qué pasa después de los 30 días?" | Las objeciones del reto y la membresía, no solo de la tienda |
| 10 | Cierre | Repetir el campo de correo | El que llegó al final está convencido; no lo mandes arriba a buscar el botón |

**Qué sale de la home:** el manifiesto largo pasa a una sección corta (2 líneas + enlace "Leer el
manifiesto"). Tres párrafos de prosa en móvil son ~1.5 pantallas sin un solo CTA.

---

## 3. Ficha de producto en orden de scroll

| # | Bloque | Qué lleva | Por qué |
|---|---|---|---|
| 1 | Migas (1 línea, 12 px) | Inicio / Tienda | Mantener, pero más baja: hoy son 32 px de padding arriba (`globals.css:197`) |
| 2 | **Galería, ~62 % del ancho de alto** | Foto 1:1 (no 4:5) con puntos de paginación | 4:5 a 86 vw son ~420 px solo de foto (`globals.css:145,230`); empuja el botón fuera |
| 3 | **Nombre + precio en la misma línea** | "Taza negra 15 oz" · **$24.99** | Precio junto al nombre: lo primero que busca el comprador móvil (Baymard, fichas de producto) |
| 4 | Frase en dorado | «Háblame de hacer dinero, no de gente» | Es el producto: la frase *es* lo que compran |
| 5 | **Botón "Comprar ahora" ancho completo + Apple Pay/Google Pay como marca visible** | Cantidad como stepper − 1 + (no `<select>`) | El botón tiene que entrar en la primera pantalla. El stepper es un toque; el `<select>` son tres |
| 6 | Fecha de llegada concreta | "Pídela hoy y llega entre el vie. 4 y el mar. 15 de dic. · Envío $8.99" | Amazon, Gymshark y casi toda tienda grande dan **fecha**, no "2–5 + 3–7 días hábiles". Baymard lo recomienda explícitamente: el usuario no suma rangos de días hábiles |
| 7 | Kit del día (venta cruzada) | "Llévate también el vaso: kit $54.99, un solo envío" | Única venta cruzada, **antes** de la descripción, no al final de la página |
| 8 | 3 viñetas | Material · Lavado · Hecha a pedido | Hoy son 5 viñetas numeradas; 2 repiten el envío |
| 9 | Garantías | Pago seguro, reemplazo por daño 30 días | Ya existe (`product-card.tsx:6`); subirlo junto al botón |
| 10 | Foto en uso | La taza en un escritorio a las 5 a. m.; el vaso en el portavasos del carro | Baymard: los usuarios buscan fotos "en escala" y en uso; las renders sobre fondo marfil no responden "¿cabe en mi portavasos?" |
| 11 | Detalle, especificaciones, preguntas | Igual que hoy | Para el que necesita más; ya está bien hecho |
| 12 | Bloque de membresía | "Miembros: 15 % en la tienda + reto gratis" | Una línea, no un banner; no compite con la compra |
| — | **Barra fija inferior** (aparece cuando el botón principal sale de pantalla) | Miniatura · nombre · $24.99 · "Comprar" | Patrón de Gymshark, Allbirds, Nike en móvil. Se oculta cuando el botón original vuelve a verse |

---

## 4. Fricciones del flujo actual (archivo:línea)

| # | Fricción | Dónde | Impacto | Arreglo |
|---|---|---|---|---|
| F1 | **El botón de compra queda por debajo del pliegue en 390 px.** Suma aprox.: header 76 + migas ~56 + galería 4:5 a 86 vw (~420) + eyebrow, nombre a 46 px, frase de 2 líneas, precio con borde, pitch → el botón cae hacia ~900 px | `globals.css:60,197,145,230,206-210`; `productos/[slug]/page.tsx:56-67` | El usuario móvil tiene que hacer scroll para *poder* comprar | §3: foto 1:1 más baja, nombre+precio en una línea, botón en la primera pantalla y barra fija |
| F2 | **No hay carrito ni kit: comprar taza + vaso son dos checkouts y dos envíos ($17.98)** | `buy-box.tsx:29` (un solo `sku`) | Mata el ticket medio y castiga al cliente que más quiere comprar | Kit con dos líneas en el mismo `items` (la API ya lo admite: `cart.ts:6`) |
| F3 | **El envío ($8.99 sobre $24.99 = 36 %) se ve en letra de 13 px gris**, después del botón | `page.tsx:68`, `globals.css:217` | Baymard: ~48 % de los abandonos de checkout son por costos extra (envío, impuestos). Que se vea *antes* es correcto; que se vea chico y después del botón, no | Mostrar el envío junto al precio; valorar **envío gratis en el kit** (umbral ≥ $50). Decisión de margen para el CEO con el costo real de Printify |
| F4 | **El teléfono es obligatorio en Stripe Checkout** | `stripe-gateway.ts:58` (`phone_number_collection: { enabled: true }`) | Un campo más, y el que más desconfianza genera (Baymard: los usuarios dudan ante el teléfono si no se explica para qué es). Stripe no permite dejarlo opcional con esa opción | Quitarlo salvo que Printify o el transportista lo exijan; si lo exigen, explicarlo en la ficha ("solo para la entrega") |
| F5 | **No hay captura de correo en ningún sitio** | `page.tsx` completo; `site-header.tsx:5-10` | El ~97–98 % que no compra (tasa de conversión típica de e-commerce: 2–3 %) se va sin dejar nada | Reto gratis con 1 campo en hero, menú y cierre |
| F6 | **La página de gracias termina en "Volver al inicio"** | `gracias/page.tsx:50` | Es el momento de mayor confianza del cliente y no se le pide nada (Shopify: las ofertas post-compra convierten precisamente porque llegan ahí) | "Tu pedido está en camino. Mientras llega: empieza el Reto 360 gratis" (correo ya conocido → 1 toque) |
| F7 | **El H1 del hero no dice qué se ofrece** | `page.tsx:26-29`; además `copy.json` tiene un `home.h1` que no se usa | Prueba de 5 segundos fallida: "¿esto es ropa, un curso, un podcast?" | H1 de marca + línea de oferta + CTA (§2, bloque 1) |
| F8 | **CTA de tarjeta "Descubrir", visible como invitación pero sin acción clara; la segunda foto solo aparece con hover** | `product-card.tsx:25`; `globals.css:160-166` | En móvil no hay hover: la mitad de la galería de la tarjeta no existe para el 70–80 % del tráfico | "Ver la taza · $24.99" y botón directo; segunda foto en carrusel o eliminada |
| F9 | **Texto de botón en 12 px, mayúsculas con 0.22 em de tracking** | `globals.css:46,54` | NN/g: las mayúsculas sostenidas se leen más lento; 12 px en un botón de 52 px es elegante pero chico en móvil | Botón principal a 15–16 px, mayúsculas solo con tracking ≤ 0.08 em, o frase normal |
| F10 | **Microtexto a 11 px** (eyebrows, cantidad, migas, specs en mono) | `globals.css:42,197,214` | Por debajo del mínimo práctico para lectura en móvil, sobre todo para un público que maneja y lee de pasada | Mínimo 12 px para etiquetas, 16 px para texto de cuerpo y campos (16 px evita el zoom automático de iOS en inputs) |
| F11 | **El menú no tiene membresía ni reto; el botón del header dice "Tienda"** | `site-header.tsx:5-10,23` | El header es el CTA persistente; hoy apunta al producto de menor valor de vida del cliente | "Reto gratis" como botón; "Membresía" y "Tienda" como enlaces |
| F12 | **Pilares inconsistentes con la visión**: el sitio dice "Carácter"; la visión dice "palabra" | `page.tsx:13` vs `docs/vision-membresia.md` | Si el reto registra "palabra", la home no puede prometer "carácter" | Unificar el nombre (decisión de marca); la maqueta usa *Palabra · Cumple* |

---

## 5. Prueba social y confianza cuando todavía no hay reseñas

**Industria.** Las DTC que lanzan sin reseñas (Huel, Liquid Death, Ridge en sus inicios) apoyan la confianza
en la **cara del fundador**, en **garantías explícitas** y en **prueba de que existe gente real** (fotos de
clientes, contadores reales). Lo que nunca hacen las que sobreviven: inventar reseñas. La FTC de EE. UU.
sancionó las reseñas y testimonios falsos con su regla de 2024; es riesgo legal, no solo ético.

**Qué usamos, en orden:**
1. **El fundador, con nombre, cara y una promesa en primera persona.** "Soy Luis. Hago el registro 360 todos
   los días con mi escuadra." La visión ya lo decide: "la marca arranca con Luis como la cara visible".
2. **Garantías concretas, junto al botón**: reembolso o reemplazo por daño en 30 días; pago con Stripe,
   Apple Pay y Google Pay; "Cancelas la membresía en un toque, sin llamadas".
3. **Contadores reales en cuanto haya un número que no dé vergüenza** (p. ej. "128 personas en el reto de
   diciembre"). Antes de eso, **escasez real** en lugar de volumen: "Precio de fundador para los primeros 100".
4. **Fotos de los primeros clientes** (taza en su escritorio, vaso en su carro), pedidas en el correo de
   entrega a cambio de un descuento. Es el sustituto honesto de las reseñas en el mes 1.
5. **Reseñas verificadas después de la entrega**, recogidas por correo (solo de compradores con pedido),
   cuando lleguen. Mostrar la media **y** las negativas: un 4.6 con críticas convierte mejor que un 5.0
   sospechoso (estudios de Spiegel Research Center / Northwestern sobre reseñas: la compra máxima ocurre
   entre 4.2 y 4.7 estrellas).
6. **Hecho en EE. UU. a pedido**, dicho como ventaja ("se imprime cuando lo pides"), no como excusa del plazo.

---

## 6. Accesibilidad mínima (es conversión: un botón que no se ve no se toca)

| Regla | Estándar | Estado hoy | Qué hacemos |
|---|---|---|---|
| Contraste de texto ≥ 4.5:1 (≥ 3:1 en texto grande y bordes de controles) | WCAG 2.2 AA 1.4.3 / 1.4.11 | Bien: `--muted` #A39E93 sobre #0E0E0D ≈ 7:1; `--line-strong` ≥ 3:1 (`globals.css:10,13`). **Riesgo**: el dorado #B89A5E en texto pequeño ≈ 7:1 sobre negro, bien; pero dorado sobre marfil no pasa | Dorado solo sobre negro. Botón principal: negro #0E0E0D sobre dorado #C9A961 (≈ 9:1) |
| Objetivos táctiles ≥ 44 × 44 px | Apple HIG (44 pt), Material (48 dp), WCAG 2.2 2.5.8 (mínimo 24 px) | Botones de 52–56 px: bien. Enlaces de texto con padding 12 px: justos | Todo control ≥ 48 px de alto en móvil; separación ≥ 8 px |
| Texto de inputs ≥ 16 px | Evita el zoom automático de Safari iOS | No hay inputs aún (salvo el `<select>` a 15 px, `globals.css:215`: provoca zoom) | Inputs a 16 px |
| Foco visible | WCAG 2.4.7 | Bien en tarjetas (`globals.css:158`) | Mantener en todo control nuevo |
| `prefers-reduced-motion` | WCAG 2.3.3 | Bien (`globals.css:117`) | Mantener; la rotación del sello se apaga |
| Etiquetas reales en formularios | WCAG 1.3.1 | — | `<label>` visible "Tu correo" (no solo placeholder) |

---

## 7. Velocidad (LCP < 2.5 s en un Android medio con 4G)

**Industria.** Google (2016): ~53 % de las visitas móviles se abandonan si la página tarda más de 3 s.
Deloitte/Google "Milliseconds Make Millions" (2020): −0.1 s de carga ≈ +8 % de conversión en retail.
Core Web Vitals: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 en el percentil 75.

| Punto | Hoy | Qué hacemos | Costo / compromiso |
|---|---|---|---|
| **Render dinámico en todo el sitio** | `layout.tsx` llama `await connection()` para el nonce de CSP ⇒ cada página se renderiza por petición: sin HTML en CDN, TTFB de función serverless, y cada visita es una invocación facturable | Evaluar CSP por *hash* o SRI (Next tiene soporte experimental de SRI; **verificar en `node_modules/next/dist/docs/`** antes de decidir) para volver estáticas home y fichas | Es la palanca de velocidad **y** de costo más grande. Gratis en tráfico bajo; con ~100k visitas/mes ya pesa en invocaciones. Es decisión de seguridad: la toma el CTO, no este documento |
| **Elemento LCP** | En móvil, el LCP es el sello (`page.tsx:46`, `fetchPriority="high"`) o el H1 en Anton | Hacer que el LCP sea **texto** (H1) con una fuente precargada; sello a 96 px | Texto pinta antes que una imagen de 46 KB |
| **Fuentes** | 4 familias, 6 archivos woff2 (~133 KB); se precargan Anton + 2 Cormorant (~68 KB) | Precargar solo la que pinta el H1 en móvil. Bajar a **2 familias** (display + cuerpo) en lo que se ve sobre el pliegue; mono solo en etiquetas, con `font-display: optional` | El lujo típico usa 3–4 familias; cada una es una petición y un posible salto de texto (CLS) |
| **Imágenes** | WebP con `srcset`, `width/height` y `loading="lazy"` (`product-gallery.tsx`): bien | Añadir AVIF; primera foto de la ficha `fetchPriority="high"` y sin `lazy` | — |
| **Capas que cuestan en Android barato** | Grano fijo a pantalla completa (`globals.css:29`) y `backdrop-filter: blur(14px)` en el header (`globals.css:59`) | Desactivar ambos en `(max-width: 860px)` o con `prefers-reduced-transparency` | Afectan scroll e INP en teléfonos de gama media, que es el teléfono del repartidor |
| **JS de cliente** | Solo `buy-box` y menú: bien | La barra fija con `IntersectionObserver` (≈ 1 KB). Nada de librerías de carrusel | — |

---

## 8. Dónde un diseño "de lujo" típico pierde ventas — y cómo evitarlo sin perder lo premium

| Hábito de lujo | Quién lo hace | Por qué pierde ventas aquí | Cómo conservar lo premium |
|---|---|---|---|
| **No mostrar precio** | Rolex, Patek | Rolex no vende online: su sitio es un folleto que manda a la boutique. Aquí *todo* es compra online de $12–35 | Precio grande, limpio, en tipografía de cuerpo con cifras tabulares. Aesop y Le Labo muestran el precio junto al nombre y siguen siendo lujo |
| **Hero de pantalla completa con imagen y un CTA vago** ("Descubrir") | Rolex, Bottega | Empuja la oferta fuera del primer pliegue (NN/g: ~57 % de la atención está ahí) | Mantener el negro, el aire y el sello; el hero mide lo mismo pero *la oferta está dentro* |
| **Texto diminuto en mayúsculas espaciadas** | Casi todas las casas de moda | Ilegible en móvil al sol, en el carro. Baja la lectura de botones | Mayúsculas solo en eyebrows de 12 px; botones en frase normal 16 px. El lujo está en el espacio, no en el tamaño |
| **Gris sobre negro de bajo contraste** | Tendencia "dark luxe" | Falla WCAG y se lee peor en pantallas OLED con brillo bajo | Hueso #ECE8E0 sobre negro y dorado solo para acentos (ya está bien; no bajarlo) |
| **Interacciones solo con hover** | Sitios pensados en escritorio | El 70–80 % del tráfico social es móvil: lo que vive en hover no existe | Todo contenido visible sin hover; hover solo como adorno |
| **Animaciones de entrada largas** | Sitios de agencia | Retrasan el LCP percibido y el primer toque | ≤ 400 ms, solo opacidad/transform, apagadas con reduced-motion |
| **Navegación críptica** ("Rumbos", "Manifiesto") | Marcas editoriales | El usuario no sabe dónde está lo que quiere | Nombres literales: Reto, Membresía, Tienda. El misterio va en el sello y el tono, no en el menú |
| **Un solo producto héroe y nada de venta cruzada** | Lujo de pieza única | Deja el ticket medio en $24.99 | Un kit, presentado como "el equipo del día", no como oferta de supermercado |

**Lo que el lujo SÍ aporta y defendemos igual:** el negro profundo, el dorado con mesura, mucho aire, la
serifa editorial en titulares, fotografía cuidada, el sello con el ojo y el anillo, y **ningún** patrón
de urgencia barata (contadores falsos, popups al entrar, "solo quedan 3"). Esos patrones bajan la
confianza en una marca de disciplina y además rozan la regla de la FTC.

---

## 9. Qué medir para saber si esto funciona (decidir antes del lanzamiento)

Eventos mínimos (nombres GA4 estándar donde existen):
- `generate_lead` con `source` = `hero` | `header` | `cierre` | `gracias` — cuál de los 4 campos trae correos.
- `view_item`, `add_to_cart` (toque en Comprar), `begin_checkout` (sesión de Stripe creada),
  `purchase` (**desde el webhook de Stripe en el servidor**, no desde el navegador).
- `select_promotion` en el kit — para saber si el kit sube el ticket o canibaliza.
- `sticky_buy_click` frente a `buy_click` — si la barra fija no se usa, se quita.

Metas iniciales razonables (para ajustar con datos reales, no para prometer): captura de correo en la home
3–8 % de visitas; conversión de ficha 2–4 %; reto → membresía 5–10 % al día 30.

---

## 10. Lo que este documento NO decide

- La paleta exacta y la tipografía final: es terreno del director de arte; aquí solo se fijan mínimos
  (contraste, tamaños, número de familias sobre el pliegue).
- Envío gratis en el kit: depende del costo real de Printify por pedido de dos piezas (decisión del CEO).
- CSP por nonce vs. por hash: es seguridad; el CTO decide con la doc de Next de esta versión.
- La plataforma de la fase 1 (Skool u otra): ya es decisión abierta en la visión.
