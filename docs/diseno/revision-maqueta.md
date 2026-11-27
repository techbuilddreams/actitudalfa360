# Revisión de la maqueta unificada (2026-11-27)

> QA de diseño y Rompedor de compra revisaron `maqueta-unificada.html` después de las decisiones 1-8.
> El CTO verificó contra el código las afirmaciones clave (`cart.ts:5`, `env.ts:36`, `vision-membresia.md:36`,
> el menú y «palabra» en la línea 558). Nada de esto está corregido todavía.

## Decisiones que necesita Luis antes del código

1. **Ventana para registrar el día.** Recomendación del CTO: se puede *registrar* el día anterior hasta el
   mediodía siguiente. No es recuperar: anotas lo que hiciste, no lo haces después. Sin esto, quien se duerme
   antes de marcar el correo pierde el día y lo vive como trampa (Rompedor P0-2).
2. **Membresía en la fase 1.** Recomendación: listar solo lo que Skool da el día del lanzamiento. Escuadra de 5 y
   registro 360 son fase 2; cobrar $12 recurrentes por ellos invita contracargos y problemas con las leyes de
   auto-renovación (NY LLC). Quitar «en un toque»: en Skool son 4-5 pasos (Rompedor P0-3, P0-4).
3. **Cómo arranca el reto.** Nada del registro existe en `src/`. Recomendación: v1 = correo diario + enlaces
   firmados de un toque + puntuación simple en Supabase; o, más barato, plantilla imprimible + correo diario y
   el registro después. Decide alcance y fecha (Rompedor P0-1).
4. **Niveles.** La línea 621 dice que el nivel se elige el día 1 y se mantiene; la FAQ 686 dice que se puede subir.
   Recomendación: se puede subir, no bajar; si bajas, esos días cuentan como Base. Quitar «de este mes».
5. **«Una pieza exclusiva de miembro»** promete un objeto físico a $12/mes: confirmar el coste o quitarlo.
6. **Menú.** La spec dice Reto, Membresía, Tienda; la maqueta tiene 5 entradas. Recomendación: Reto, Pilares,
   Tienda, Membresía (Guías cuando existan).

## Correcciones sin decisión (van con la implementación, con TDD)

**Dinero / compra**
- Selector de cantidad 1-10 en la maqueta; el servidor acepta 1-5 (`MAX_QTY_PER_LINE`, `cart.ts:5`). A 6 falla
  siempre. Fuente única: el límite sale del dominio. La nota de la línea 758 confunde líneas con unidades.
- Fecha de entrega como hecho con `PRINTIFY_AUTO_ORDER=false` por defecto (`env.ts:36`): «Llega aprox.» o
  confirmar auto-order en prod. Fines de semana y feriados.
- Ficha a 390 px: el botón de compra queda bajo el pliegue (739 > 664 px). La nota 746 es falsa.
- Barra fija de compra: no aparece si se salta el botón (ancla, restaurar scroll). Observar un centinela.
- Kit: `cancelUrl` va a `/#tienda` y no a la ficha (`create-checkout.ts:22`).
- Teléfono obligatorio en Stripe (`stripe-gateway.ts:58`): Printify lo recibe opcional, se puede quitar.
- Devoluciones: la política dice reposición **o reembolso** y cubre producto equivocado; la maqueta solo
  reposición. «Avísanos dentro de 30 días de la entrega».
- $8.99 escrito a mano: sale de `SHIPPING_FLAT_CENTS`. Si se activa `STRIPE_AUTOMATIC_TAX`, avisar del impuesto.

**Reto**
- Día 1 y hora del correo sin zona horaria. Capturar la zona en el alta; definir el corte del día.
- Aviso de salud solo en /reto; ponerlo junto a cada formulario y en el correo de bienvenida.
- Privacidad: enlace en el campo, «recibirás un correo cada día», política que cubra la lista y Resend,
  dirección postal en el pie (CAN-SPAM).
- «Puntuación 360» suena a sobre 360; el máximo es 120.
- Reglas difusas: «10 páginas» con audiolibros, «30 minutos en ahorro», «la plantilla» sin explicar.
- Decir en el texto público (no solo en la nota) que el día lo marca el calendario y que un fallo vale cero.

**Accesibilidad / diseño**
- Borde del campo de correo y otros con `--hair-2`: 1.78:1, se pide 3:1 (WCAG 1.4.11).
- Anillo de foco sobre la barra hueso: 2.51:1.
- Placeholder #77726A: 4.13:1.
- `.btn{display:inline-flex}` gana a `hidden`: añadir `[hidden]{display:none!important}`.
- Áreas táctiles < 44 px: pie, migas, enlaces de pilar, callout, marca.
- Pie salta de H2 a H4. `aria-label` en divs sin rol. Nombre duplicado del enlace de marca.
- «palabra» sigue en la FAQ (línea 558).
- Pesos: `sello-320` 46 KB para 88 px; la taza a 390 baja 1200 px sin srcset.
- Enlaces muertos: pilares, guías, membresía, privacidad. «Envíos y devoluciones» → `/politicas#envios` hoy.

## Lo que se probó y aguantó

Contraste de todo el texto (mín. 6.38:1), sin scroll horizontal a 390/375, campo del reto sobre el pliegue a 390
(no en iPhone SE 375×548), sello 88/360 px, CLS cubierto, precios y pilares coherentes en las tres vistas, envío
fijo y suma del kit honestos, sin precio de fundador ni descuento de miembro, ninguna regla insegura.
