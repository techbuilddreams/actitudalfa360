# Visión: membresía y comunidad "El 360"

> Visión aprobada por Luis (CEO) el 2026-11-26. Fuente de verdad del rumbo del producto.

## Idea central

Una **membresía de disciplina con rendición de cuentas**, no un grupo para charlar.
Lo que retiene es que alguien te pregunte cada día *"¿cumpliste hoy?"*.
Se premia la **disciplina real**, no la actividad (publicar/comentar).

## Niveles

| Nivel | Precio | Qué incluye |
|---|---|---|
| Gratis (embudo) | $0 | Reto público de 30 días, contenido semanal |
| **Miembro** (arranque) | ~$12/mes | Registro diario de los 4 pilares (cuerpo, mente, dinero, palabra) · escuadras de 5 que se ven el progreso · reto nuevo cada mes · descuento en la tienda · pieza exclusiva de miembro |
| **Círculo** (después) | ~$49–99/mes | Llamada en vivo mensual · grupo pequeño de negocio/dinero · acceso directo al fundador y a los embajadores |

**Se empieza con lo más simple: solo el nivel de $12.** Los niveles superiores se agregan cuando haya miembros que se quedan.

## Modelo de "campus" con embajadores (referencia de estructura: The Real World)

- **Fase inicial:** la marca arranca con Luis como la cara visible.
- **Después:** **embajadores** por pilar — personas con resultado comprobado en un área (cuerpo, dinero, mente, carácter) que enseñan a otros a obtenerlo.
- Cada pilar puede convertirse en un "campus" con su embajador, contenido y retos.
- **Distintos niveles de membresía = distintos accesos** (qué campus, qué llamadas, qué grupos).
- Se toma de The Real World la **estructura** (campus por área, expertos con resultados, niveles de acceso); **no** su tono ni su asociación de marca. La marca ya dice: *"No es dominar a nadie, es dominarte a ti."*

## Diferenciador

La **puntuación 360 diaria con escuadras**: cumplir en los 4 pilares, visible a tu escuadra.

## Ruta: validar antes de construir

1. **Fase 1 — sin código:** lanzar en una plataforma existente (Skool o similar; confirmar precios vigentes). Medir: ¿pagan?, ¿se quedan después del mes 2?
2. **Fase 2 — plataforma propia:** con ~50–100 miembros que retienen, construir el registro 360, escuadras, campus y niveles en el sitio (Stripe ya integrado; LLC de EE. UU., cobro recurrente con Stripe sin problema).
   El punto de cruce: cuando la comisión de la plataforma cuesta más que mantener la propia.

## Tecnología (decidida 2026-11-26)

- **Login:** Supabase Auth (la misma base Supabase Postgres del sitio).
- **Videos:** Bunny Stream, reproducidos **dentro** del sitio; enlaces firmados que vencen, emitidos por el servidor solo si el nivel del miembro le da acceso a ese campus.
- **Acceso:** Stripe Billing → webhook → tabla de membresías (nivel, estado, vence). Se decide en el servidor, nunca en el navegador.
- Infra y orden de trabajo: [`plan-migracion-vercel.md`](plan-migracion-vercel.md).

## Decisiones abiertas

- Plataforma de la fase 1 (recomendación: Skool, por retos + ranking + cursos nativos).
- Cómo se selecciona, se valida y se le paga a un embajador (reparto de ingresos por campus vs. pago fijo).
- Nombre definitivo de los niveles.

## Herencia del repo viejo `actitud-alfa-360` (revisado 2026-11-26)

Repo privado `techbuilddreams/actitud-alfa-360`: PWA en Nuxt 3 + Firebase + OpenAI ("El Círculo de los
Poetas Alfa"), último push 2025-11-27. **No se reutiliza el código** (otro stack; este sitio es Next + Supabase).
Lo que sí vale para el futuro — *propuesta del CTO, pendiente de aprobación*:

- **El pilar "palabra" ya tiene contenido diseñado.** Vocabulario con contexto de liderazgo + poema diario con
  "interpretación alfa" + **desafío diario** encaja directo como el registro diario del pilar *palabra* (cuerpo,
  mente, dinero, palabra). El desafío del poema = la tarea de hoy que la escuadra ve cumplida o no.
- **Candidato a primer "campus"** cuando lleguen los embajadores: Comunicación / Palabra.
- **Misión, reescrita al tono actual.** La vieja ("mentalidad alfa a través del dominio del lenguaje") se acerca,
  pero choca con *"No es dominar a nadie, es dominarte a ti."* Rescatar la idea, no la palabra "dominio" sobre otros.
- **Lo que NO se trae:** generar poemas con GPT-4 cada día (costo recurrente y precisión no medida: si vuelve,
  va con evals), la paleta oro/púrpura (el sitio ya tiene su diseño), Firebase.
- Antes de archivar ese repo: confirmar que no quedan llaves reales en su historial (Firebase Admin, OpenAI).
