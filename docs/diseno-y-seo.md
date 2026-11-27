# Diseño premium + SEO: síntesis del CTO

> 2026-11-27. Cuatro especialistas en paralelo; este archivo junta sus entregas, resuelve dónde chocan y lista
> lo que decide Luis. **Nada de esto está en `src/` todavía**: primero se aprueba una maqueta unificada.

## Las entregas

| Especialista | Archivo | Ángulo |
|---|---|---|
| Director de arte de lujo | [`diseno/direccion-lujo.md`](diseno/direccion-lujo.md), [`diseno/maqueta-lujo.html`](diseno/maqueta-lujo.html) | Que se vea top of the line (Rolex, Aesop, The Row) |
| Especialista UX de conversión | [`diseno/direccion-conversion.md`](diseno/direccion-conversion.md), [`diseno/maqueta-conversion.html`](diseno/maqueta-conversion.html) | Que venda en el móvil |
| Investigador SEO de demanda | [`seo/demanda-palabras-clave.md`](seo/demanda-palabras-clave.md) | Qué busca la gente (volúmenes de YouTube/vidIQ, no de Google) |
| Estratega SEO de competencia | [`seo/competencia-y-arquitectura.md`](seo/competencia-y-arquitectura.md) | Quién gana en Google y con qué estructura |

Las maquetas cargan el logo desde `file:///Users/luisramos/Desktop/...`: se ven solo en esta Mac.

## Donde coinciden (se toma tal cual)

- **El reto gratis de 30 días es la puerta de entrada.** Conversión lo pone como CTA principal (un campo de correo);
  la competencia SEO ve el hueco en "reto 30 días" (solo Hotmart/ebooks; 75 Hard esconde sus reglas). Reglas abiertas,
  correo para el registro diario. **Depende del paso 3 (Resend)** y de una tabla de suscriptores.
- **Disciplina, no "alfa", en títulos y H1.** "Alfa" en Google = manosfera/"sigma"/Tate. La marca conserva el nombre y
  el sello; las páginas rankean por "cómo ser disciplinado", "autodisciplina", "hábitos".
- **Fuera Anton y el brillo dorado.** Quedan Cormorant + Archivo (ya en el repo). Dorado mate, < 3–5 % de pantalla,
  nunca en botones.
- **Barra de compra fija solo en la ficha de producto**, en hueso, sin dorado.
- **El sitio necesita URLs propias:** `/reto-30-dias` → un pilar por página → 3 guías → `/membresia`.

## Donde chocan, y lo que recomienda el CTO

| Choque | Lujo | Conversión | CTO |
|---|---|---|---|
| Hero en móvil | Sello monumental, una frase, un CTA | Sello a 72 px para que el CTA entre arriba | **Sello grande en escritorio, reducido en 390 px**; el CTA del reto siempre visible sin scroll |
| Botones | Mayúsculas 12 px espaciadas | Frase normal 16 px | **Conversión**: legibilidad y toque (WCAG); el lujo va en la tipografía de titulares |
| Menú | "Manifiesto", "Rumbos" | "Reto, Membresía, Tienda" | **Conversión**: y es lo que Google entiende |
| Precio | En texto, nunca titular | Junto al nombre, arriba | **Junto al nombre, en texto de cuerpo** (visible sin gritar) |
| Precio tachado, contadores, "X se unieron hoy" | No | Sí | **No.** Sin reseñas reales no hay prueba social que mostrar; inventarla es riesgo legal (FTC) y de marca |
| "Precio de fundador · primeros 100" | No | Sí | **Solo si es verdad y lo cuenta el servidor**; si no, no se muestra. Decide Luis |
| Kit taza + vaso, un envío | — | Sí | **Sí**: solo interfaz (`buy-box.tsx:29`; el carrito ya acepta varias líneas) |

## Lo que decide Luis

1. ¿Títulos con "disciplina" en vez de "alfa"? (recomendación: sí; el nombre y el sello se quedan)
2. Cuarto pilar: ¿**palabra** (visión) o **carácter** (home actual)? Hoy el sitio se contradice.
3. ¿Precio de fundador real para los primeros 100 miembros?
4. Volver a fotografiar las piezas sobre fondo oscuro o papel (las fotos actuales tienen fondo blanco puro).

### Decididas el 2026-11-27

1. **Sí, disciplina** en títulos y H1. "Alfa" queda solo en la marca, el sello y el lema.
2. **Carácter · Cumple** es el cuarto pilar. Hay que corregir "palabra" en `docs/vision-membresia.md` y en
   `seo/competencia-y-arquitectura.md` (`/pilares/palabra` pasa a `/pilares/caracter`).
3. **Sin precio de fundador** por ahora: ningún cupo ni contador en el sitio.
4. **Se vuelven a fotografiar** las piezas sobre papel (`--paper`), con luz dura desde la izquierda y en formato 4:5. Hasta entonces, las
   fotos de `public/img/stage/` sirven de puente.
5. **Maqueta unificada aprobada** tal cual.
6. **Reglas del reto**: valen los mínimos Base/Estándar del borrador del CTO.
7. **Fallar un día: sin reinicio y sin recuperar.** El día lo marca el calendario desde que empiezas; si fallas
   el 9, mañana haces el 10. El día fallado vale cero y no se rellena después. Cuenta la puntuación, no la racha.
8. **Sin descuento de miembro** por ahora: no aparece en la membresía ni en la ficha.

### Abiertas

- **Copy del fundador** (3 líneas en primera persona) y **foto real de Luis**: las escribe y las pone Luis.

## Deuda técnica que salió (no es diseño)

- `layout.tsx:53-54`: `await connection()` por la CSP con nonce ⇒ todas las páginas son dinámicas (cada visita se
  factura, sin caché). Evaluar CSP con hashes o nonce solo donde hay scripts. Tarea propia, toca seguridad.
- `layout.tsx:37`: canonical `/` en el layout raíz; toda ruta sin canonical propio lo hereda.
- `copy.json` y `public/llms.txt` describen una tienda de "tazas y vasos" sin reto ni membresía.
- `sitemap.ts`: `lastModified: new Date()` en cada petición.
- Teléfono obligatorio en Stripe Checkout (`stripe-gateway.ts:58`): confirmar si Printify lo exige antes de quitarlo.
- Search Console: verificado por DNS; enviar `/sitemap.xml` tras el primer deploy a `main`.

## Siguiente paso

QA y Rompedor ya revisaron la maqueta: [`diseno/revision-maqueta.md`](diseno/revision-maqueta.md).
1. **Luis** decide los 6 puntos de "Decisiones que necesita Luis" (cada uno trae recomendación del CTO).
2. **CTO** aplica decisiones y correcciones a la maqueta y la republica.
3. Código con TDD en una rama propia, empezando por el dominio del reto (día por calendario, ventana de registro,
   puntuación) y el límite de cantidad único.
