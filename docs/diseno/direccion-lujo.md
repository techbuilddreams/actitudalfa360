# Dirección de arte: lujo minimalista

> Propuesta del Director de arte de lujo minimalista, 2026-11-27. Ángulo deliberado: que la marca se lea al nivel de Rolex, Aesop, Equinox o The Row. Hay una propuesta paralela con el ángulo opuesto (conversión en móvil); el CTO resuelve. Maqueta: [`maqueta-lujo.html`](maqueta-lujo.html).

## La tesis en una línea

El lujo no se anuncia: **se contiene**. Lo que separa a Actitud Alfa 360 de un curso de "hazte rico" no es el negro ni el dorado (los dos usan negro y dorado), es **cuánto se calla**: menos colores, menos familias, menos movimiento, más aire y un sello que se trata como un monumento, no como un adorno.

## Principios (7)

1. **El silencio es el producto.** Cada pantalla tiene una sola idea. Si un bloque necesita un segundo titular para defenderse, sobra.
   *The Row:* home con una foto, un nombre y nada más. → Nosotros: hero = sello + una frase + un botón.
2. **El dorado es un sello de lacre, no una pintura.** Menos del 3 % de la superficie de cualquier pantalla (techo del CTO: 5 %). Mate, plano, sin degradados, sin brillo, sin sombra.
   *Rolex:* el verde y el oro aparecen en la corona y en un filete; el resto es blanco y negro. → Nosotros: dorado solo en el filete del sello, en el numeral del pilar activo y en el anillo de foco.
3. **Dos voces, nunca tres.** Una serif para hablar (Cormorant Garamond), una grotesca para informar (Archivo). Se va la condensada de impacto y se va la monoespaciada.
   *Aesop:* una sola familia (Suisse) y la jerarquía la hace el tamaño y el espacio. → Nosotros: dos, porque la serif carga el aire de orden antiguo que el sello pide.
4. **El misterio se gana con lo que no se explica.** El ojo y el triángulo no se justifican con texto; se ponen grandes, centrados, solos. Nada de "nuestro logo significa…" en la home.
   *Equinox:* "It's not fitness. It's life." y nada más; la pertenencia se insinúa. → Nosotros: "Se entra por invitación de uno mismo."
5. **El precio se dice en voz baja.** Sin tachados, sin "¡oferta!", sin contadores, sin insignias. El precio aparece una vez, en la tipografía de texto, al lado del nombre.
   *Hermès / The Row:* precio en cuerpo de texto, mismo tamaño que la descripción. → Nosotros: precio en Archivo 15 px con cifras tabulares.
6. **El ritmo es arquitectura.** Espaciado en una escala de 8, márgenes grandes y siempre los mismos. Si todo respira igual, el ojo confía.
   *Rolex.com:* bloques modulares, mismo margen vertical entre todos. → Nosotros: una sección = 128 px arriba/abajo en escritorio, 80 px en móvil, sin excepciones.
7. **Disciplina visible.** La marca predica disciplina; el sitio la practica: nada se mueve sin razón, nada parpadea, nada pide atención dos veces.

## Paleta

| Token | Hex | Uso | Proporción |
|---|---|---|---|
| `--ink` | `#0B0B0A` | Fondo único. Negro casi puro, con un punto cálido para que no sea azul en pantallas OLED. | ~80 % |
| `--ink-2` | `#121211` | Banda de membresía y pie. Solo un escalón; nunca tres grises de fondo. | ~8 % |
| `--bone` | `#EDE8DE` | Texto principal y botón primario. Blanco hueso cálido: papel, no pantalla. | ~8 % |
| `--stone` | `#9C968B` | Texto secundario (≈7:1 sobre `--ink`). | ~2 % |
| `--hair` | `rgba(237,232,222,.12)` | Filetes de 1 px. | — |
| `--gold` | `#A99060` | Dorado mate y plano. Contraste ≈6,5:1 sobre `--ink`, así que también sirve para texto pequeño cuando haga falta. | **< 3 %** |
| `--paper` | `#E9E3D7` | Escenario de producto (fondo de la foto). | dentro de la foto |

**Reglas duras del dorado**
- Nunca en un botón, ni de fondo ni en hover.
- Nunca en un titular entero. Como mucho una palabra (y preferiblemente ninguna).
- Nunca en degradado, `text-shadow`, `box-shadow`, brillo radial ni "foil".
- Sí: el anillo del sello, un numeral romano, el filete de 1 px bajo la sección activa, el foco del teclado.
- Prueba del pulgar: si tapas el dorado con el pulgar en el móvil y la pantalla sigue entendiéndose, está bien usado.

*Rolex → nosotros:* Rolex usa su verde para la corona y la marca registrada; jamás para un CTA. Nuestro dorado es nuestra corona.

## Tipografía

| Papel | Familia | Tamaño (móvil → 1440) | Peso | Tracking | Interlínea |
|---|---|---|---|---|---|
| Display (hero) | Cormorant Garamond | 44 → 96 px | 500 | -0,02 em | 1,0 |
| H2 | Cormorant Garamond | 34 → 56 px | 500 | -0,015 em | 1,05 |
| H3 / nombre de producto | Cormorant Garamond | 26 → 34 px | 500 (cursiva para la frase) | -0,005 em | 1,15 |
| Etiqueta (eyebrow) | Archivo | 11 px | 500 | +0,32 em, MAYÚSCULAS | 1,4 |
| Texto | Archivo | 16 → 17 px | 400 | 0 | 1,7 |
| Botón | Archivo | 12 px | 500 | +0,24 em, MAYÚSCULAS | 1 |
| Precio | Archivo | 15 px | 400 | +0,04 em, cifras tabulares | 1 |

- Ambas ya están en `src/app/fonts/` (Cormorant 500 normal/cursiva y Archivo variable). **Coste cero de fuentes nuevas**; se eliminan dos (Anton, IBM Plex Mono) ⇒ menos bytes y menos FOUT.
- Escala modular 1,333 (cuarta justa). La jerarquía la hacen tamaño y aire, no el peso: nada por encima de 500.
- Cifras de alineación (`lining-nums`) siempre, como ya hace el sitio.
- *Aesop → nosotros:* Aesop nunca usa negrita en la web; el énfasis es el blanco alrededor. Igual aquí.
- *The Row → nosotros:* nombres de producto en serif, información en sans pequeña y espaciada.

## Ritmo y espaciado

- Escala: 4 · 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128 px.
- Sección: 128 px vertical en 1440, 80 px en 390. Margen lateral: 16 px en móvil (el mínimo de lectura cómoda a 390), 64 px en 1440. Contenido máx. 1200 px; texto corrido máx. 56 caracteres.
- Retícula de 12 columnas en escritorio, 4 en móvil. El texto nunca ocupa más de 6 de 12.
- El hero ocupa la primera pantalla entera (`min-height: 100svh` menos la barra), con el sello en el centro óptico (un poco por encima del centro geométrico).
- *Equinox → nosotros:* bloques a pantalla completa, una idea por scroll.

## Tratamiento del logo

- **El sello es un monumento.** En el hero, grande (240 px en móvil, 360 px en 1440), centrado, solo, en hueso sobre negro. Nunca en una tarjeta, nunca dentro de un círculo extra, nunca con un anillo SVG girando alrededor.
- **El disco negro del sello se funde con `--ink`.** El PNG oficial es un disco negro con trazo blanco: sobre `#0B0B0A` el disco casi desaparece y queda solo el trazo en hueso, como grabado en la noche. No se invierte (invertido se vuelve un disco blanco gigante, una pegatina). Para producción conviene un SVG solo-trazo exportado desde `Source File.ai`.
- **Dos colores permitidos:** hueso sobre negro (uso normal) y negro sobre papel (escenario de producto, empaque). Dorado solo en un uso: el anillo exterior del sello en piezas exclusivas de miembro. Nunca en la web.
- **Área de respeto:** un 50 % del diámetro libre a cada lado.
- **En la barra:** sello de 28 px + "ACTITUD ALFA 360" en Archivo 11 px tracking 0,32 em. Nada más.
- **Tamaño mínimo:** 24 px en pantalla; debajo de eso se usa solo el texto.
- El aire masónico se **subraya, no se suaviza**: un único elemento ritual — el sello — y la geometría del triángulo como único motivo gráfico secundario (un triángulo de filete de 1 px como separador, como máximo una vez por página).
- *Rolex → nosotros:* la corona nunca se deforma, nunca se anima, nunca convive con otro logo.

## Fotografía y arte

- **Producto:** naturaleza muerta sobre papel `--paper`, luz única dura desde la izquierda, sombra real, sin reflejos de estudio genéricos. Encuadre 4:5. La taza a un tercio de la altura del marco: el aire es parte de la foto.
- **Personas (cuando las haya):** blanco y negro, grano de película real, manos trabajando, el amanecer en la ruta, la barra en el gym a las 5 a. m. Gente real de la comunidad; nunca modelos de stock.
- **Fotos actuales:** tienen fondo blanco puro. En la maqueta se integran con `mix-blend-mode: multiply` sobre `--paper` (el blanco toma el tono papel). Sirve de puente; lo correcto es volver a fotografiar sobre papel.
- **Prohibido en fotos:** autos de lujo, fajos de billetes, puros, relojes ajenos, jets, mujeres como accesorio, gráficos de bolsa, flechas hacia arriba. Es exactamente el lenguaje de "hazte rico" que nos hunde.
- **Ilustración:** solo el sello y el triángulo. Nada de iconos de línea genéricos para los pilares: los pilares se nombran con numerales romanos.
- *Aesop → nosotros:* bodegones de producto sobre superficies cálidas y tiendas físicas fotografiadas como arquitectura. *The Row:* el producto ocupa poco del marco.

## Movimiento

- Un solo gesto: **aparecer** (opacidad 0→1 y 8 px de desplazamiento, 700 ms, `cubic-bezier(.2,.7,.1,1)`), una sola vez al cargar. Nada al hacer scroll.
- Hover: cambio de color o de filete en 300 ms. Sin barridos de relleno, sin zoom de foto mayor a 1,02.
- Fuera: el sello que gira al cargar, el barrido dorado de los botones, el filete dorado que crece en los pilares, el desvanecido a la foto alternativa.
- `prefers-reduced-motion: reduce` ⇒ cero animaciones (ya existe; se mantiene).
- *Rolex → nosotros:* el movimiento de Rolex es lento, cinematográfico y escaso. Nosotros no tenemos video aún; la sobriedad es la versión barata de lo mismo.

## Qué cambia respecto a `src/app/globals.css`

**Se queda**
- La arquitectura de tokens en `:root`, la CSP sin estilos inline y `lining-nums`.
- `--ink`, `--bone`, `--muted` (renombrado `--stone`) con valores ajustados; el escenario de producto claro (`--ivory` → `--paper`).
- Cormorant Garamond y Archivo (ya autoalojadas).
- Las etiquetas en versalitas espaciadas, la FAQ con `<details>`, `prefers-reduced-motion`.
- Botones rectos (`border-radius: 0`). El radio cero es correcto.

**Se va, y por qué**
- **Anton** (`--display`, mayúsculas condensadas del hero y numerales huecos de pilares): es la voz del gimnasio y del póster de promoción. Es la pieza que más empuja hacia "curso de hazte rico".
- **IBM Plex Mono** (`--mono` en etiquetas, migas, precios): lee a startup tecnológica, no a casa de lujo.
- **El grano fijo** (`body::before`, `z-index:100`): ensucia el negro, cuesta pintura en móviles y es un recurso de moda, no de permanencia.
- **El resplandor dorado radial del hero** (`.hero::before`): es literalmente luz de casino.
- **El barrido dorado de `.btn`**: dorado en un botón rompe la regla del sello. Botón primario hueso, hover a contorno.
- **Titular en dorado cursivo** (`.hero h1 .l2`, `.manifesto blockquote em`, `.pdp-quote`): demasiado dorado en tipografía grande. La frase va en hueso cursiva; el dorado se reserva.
- **El marco dorado dentro de la foto** (`.stage::after`): decoración; compite con el producto.
- **`--brass-hi`**: un segundo dorado "más brillante" es el primer paso hacia el foil. Uno solo.
- **El filete dorado de las etiquetas** (`.eyebrow::before` en `--brass`): pasa a `--hair`. Las etiquetas pasan a `--stone`.

Estimación de dorado en pantalla hoy (hero de la home a 1440): titular de segunda línea, etiqueta, filete, resplandor, anillo SVG ⇒ bastante más del 5 %. Con esta propuesta: el anillo del sello y un filete ⇒ < 2 %.

## Lo que NO hacemos

- Dorado brillante, degradados metálicos, texturas de mármol, foil, brillos, `text-shadow`.
- Tipografías condensadas en mayúsculas gritando, ni negritas de 700+.
- Contadores de tiempo, "¡últimas unidades!", precios tachados, ventanas emergentes de descuento, barras de anuncio que parpadean.
- Testimonios con estrellas de colores y fotos de stock sonrientes.
- Fotos de autos, billetes, puros, relojes, jets o "estilo de vida" prestado.
- Más de un CTA primario por pantalla.
- Iconos de línea genéricos, emojis, insignias de "más vendido".
- Explicar el sello. El misterio no se explica.
- Animaciones al hacer scroll, carruseles automáticos, cursor personalizado.
- La palabra "dominar" aplicada a otros. El lema manda: *"No es dominar a nadie, es dominarte a ti."*

## Dónde espero chocar con el especialista de conversión

- **Urgencia y prueba social** (contadores, estrellas, "47 miembros se unieron hoy"): mi posición es no, nunca en la home; la prueba social, si existe, es una cita en serif con nombre y oficio reales.
- **CTA fijo en móvil:** aceptable solo en la ficha de producto, en hueso, sin dorado, y que aparezca tras pasar el botón original. No en la home.
- **Precio grande y arriba:** el precio se ve sin scroll en la ficha, pero en cuerpo de texto, no como titular.
- **Más contenido por pantalla:** no. Si la conversión necesita más argumentos, van más abajo, no más apretados.
