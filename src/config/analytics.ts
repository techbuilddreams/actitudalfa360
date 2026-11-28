/** ID de GA4 (`G-…`). El mismo patrón valida la build en `deploy-rules.ts`. */
export const GA_MEASUREMENT_ID_RE = /^G-[A-Z0-9]{4,16}$/;

/** El ID si hay que medir; null en staging (no ensucia los datos reales), en local sin ID, o con un ID raro. */
export function measurementId(env: Record<string, string | undefined> = process.env): string | null {
  const id = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id || !GA_MEASUREMENT_ID_RE.test(id) || env.NEXT_PUBLIC_APP_ENV === 'staging') return null;
  return id;
}
