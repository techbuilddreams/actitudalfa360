# Idea guardada: PWA nativa + "Ciclo" para miembros (Luis, 2026-11-27)

> Idea capturada, **no diseñada ni aprobada para código**. Va en la membresía. Antes de construir: plan,
> especialistas (PWA, privacidad de datos de salud, contenido) y la regla de siempre (QA + rompedor).

## 1. Todo el sitio se siente como una app nativa (PWA)

Lo pide Luis: "100% profesional, nítida, que se sienta como una aplicación móvil nativa, sencilla".
- Instalable (manifest, iconos, splash), modo `standalone`, arranque rápido, funciona con mala señal (service worker).
- Navegación de app: barra inferior, transiciones, sin saltos de layout, gestos y áreas táctiles de 44 px.
- Notificaciones push (las necesita el punto 2).
- Lleva un **Especialista en PWA** propio.
- **Trampa conocida:** en iPhone, el push web solo funciona si la PWA está **instalada en la pantalla de inicio**
  (iOS 16.4+). Sin instalar, no hay notificación de la mañana. La instalación guiada es parte de la función.

## 2. "Ciclo": entender a tu pareja en cada fase

**Qué es:** el miembro registra el ciclo de su pareja (con el nombre que él quiera: "Jenny", "Wifey", "Sofía"). No es
un tracker de periodo sin más: es para que **él** sepa cómo conectar con ella según la fase.

- **Las 4 fases:** menstrual, folicular, ovulación, lútea.
- **Aviso de la mañana (push):** "Alfa, recuerda que hoy Jenny entra en su fase lútea", con cómo tratarla ese día.
- **Guía por fase:** qué necesita, cómo hablarle, qué evitar. En la fase menstrual, cómo cuidarla.
- **Cruce con sus 5 lenguajes del amor:** él marca los de ella y la guía se adapta.
- **Planificador:** "Este fin de semana ella va a estar ovulando: tremenda idea para invitarla a cenar, a bailar...".
  Propone fechas según la fase.
- **Regla 2-2-2:** una cena cada 2 semanas, un getaway cada 2 meses y unas vacaciones cada 2 años. El planificador
  recuerda cuándo toca cada una.
- **Más de un perfil:** pareja, mamá, hermana, socias, familiares, para entender y tratar mejor a cada una.
- **Hábito:** son recordatorios mientras el hábito se forma; el objetivo es que él lo aprenda, no que dependa de la app.

**Filosofía (por qué está en la membresía):** "alfa" = hombre integrado (David Deida). Es un buen proveedor, está
físicamente sano, trabaja sus relaciones y cuida su vida espiritual: 360 en cada área. La relación con su pareja
está en el pilar **Carácter**.

**Fuente del contenido:** el libro de Luis *Cómo entender y cuidar a tu pareja en cada fase de su ciclo*:
`~/Desktop/Mis Libros/Cómo Entender y Cuidar a Tu Pareja en Cada Fase de su Ciclo/final/` (pdf y docx).
Los textos por fase salen de ahí, no se inventan.

## Lo que el CTO ve antes de diseñar (decisiones abiertas)

1. **Consentimiento de ella.** Son datos de salud de una tercera persona que no aceptó nada. Recomendación: que él la
   **invite** (enlace) y ella confirme o comparta su ciclo; sin confirmación, el perfil se queda en una guía sin
   fechas. Aún más importante para socias y familiares: registrar el ciclo de una compañera de trabajo sin que lo
   sepa es justo lo que convierte la función en un escándalo. Recomendación: perfiles de terceros solo con su
   invitación aceptada.
2. **Ley.** Datos de salud reproductiva: FTC Health Breach Notification Rule, Washington My Health My Data Act y
   leyes estatales similares (la LLC es de NY). Hace falta revisión legal antes del lanzamiento. Cifrado, borrado
   real, nada de datos de ciclo en analítica ni en el texto del push (la notificación se ve en la pantalla bloqueada).
3. **No es médico.** La predicción de la ovulación es una estimación; el aviso tiene que decir que no sirve como
   anticonceptivo ni como diagnóstico.
4. **Tono.** "Cómo tratarla mejor", no "cómo manejarla". El copy lo revisa alguien que no sea el autor.

## Orden propuesto

Primero la membresía de la fase 1 y el reto (ver `docs/diseno/revision-maqueta.md`). Después la base PWA, porque Ciclo
la necesita para el push. Ciclo va con la plataforma propia (fase 2 de `docs/vision-membresia.md`).
