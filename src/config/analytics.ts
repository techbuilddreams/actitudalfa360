/** ID de GA4 (`G-…`). El mismo patrón valida la build en `deploy-rules.ts`. */
export const GA_MEASUREMENT_ID_RE = /^G-[A-Z0-9]{4,16}$/;

/** El ID si hay que medir. Lista blanca: SOLO producción mide (staging, local o un entorno mal escrito, no). */
export function measurementId(env: Record<string, string | undefined> = process.env): string | null {
  const id = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id || !GA_MEASUREMENT_ID_RE.test(id) || env.NEXT_PUBLIC_APP_ENV !== 'production') return null;
  return id;
}
