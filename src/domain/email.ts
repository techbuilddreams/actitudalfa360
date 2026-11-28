const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Correo recortado y en minúsculas, o null si no es válido. Puro: lo usan cliente y servidor. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (v.length === 0 || v.length > 254) return null;
  return EMAIL.test(v) ? v : null;
}
