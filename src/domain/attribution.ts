/**
 * Atribución de una compra: de qué campaña llegó (UTM, se guarda con el pedido) y a qué visita de GA4 pertenece
 * (client_id y session_id, solo viajan para el `purchase` server-side; NO se guardan en la base).
 * Todo esto nace en el navegador y SOLO si la medición está encendida: es entrada externa, se valida aquí, y
 * lo mal formado se descarta campo a campo. Nunca rechaza un pago.
 */

export interface Utm {
  readonly source: string | null;
  readonly medium: string | null;
  readonly campaign: string | null;
  readonly term: string | null;
  readonly content: string | null;
}

export interface Attribution {
  readonly gaClientId: string | null;
  readonly gaSessionId: string | null;
  readonly utm: Utm | null;
}

/** Campaña de la primera visita, recordada en el navegador. */
export interface StoredTouch { readonly utm: Utm; readonly at: string }

export const UTM_MAX_LEN = 100;
/** La primera campaña vale este tiempo; después, una visita nueva empieza de cero. */
export const ATTRIBUTION_MAX_AGE_DAYS = 90;
export const EMPTY_ATTRIBUTION: Attribution = { gaClientId: null, gaSessionId: null, utm: null };

const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;
const CLIENT_ID_RE = /^\d{1,12}\.\d{1,12}$/;
const SESSION_ID_RE = /^\d{1,12}$/;

/** `_ga` = GA1.<niveles>.<aleatorio>.<segundos> ⇒ client_id = «aleatorio.segundos». */
export function gaClientIdFromCookie(value: string | undefined): string | null {
  const m = /^GA1\.\d+\.(\d+)\.(\d+)$/.exec(value ?? '');
  if (!m) return null;
  const id = `${m[1]}.${m[2]}`;
  return CLIENT_ID_RE.test(id) ? id : null;
}

/** `_ga_<contenedor>`: GS1.1.<session_id>.… (hasta 2025) o GS2.1.s<session_id>$o…$g… (desde 2025). */
export function gaSessionIdFromCookie(value: string | undefined): string | null {
  const v = value ?? '';
  const m = /^GS1\.\d+\.(\d+)\./.exec(v) ?? /^GS2\.\d+\.s(\d+)(?:\$|$)/.exec(v);
  return m && SESSION_ID_RE.test(m[1]!) ? m[1]! : null;
}

/** Recorta, quita caracteres de control y limita a 100. Vacío ⇒ null. */
function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, UTM_MAX_LEN).trim();
  return s || null;
}

/** Sin `source` no hay campaña: GA4 tampoco atribuye una UTM sin él. */
function toUtm(get: (k: (typeof UTM_KEYS)[number]) => unknown): Utm | null {
  const utm = Object.fromEntries(UTM_KEYS.map((k) => [k, clean(get(k))])) as unknown as Utm;
  return utm.source ? utm : null;
}

export function utmFromSearch(search: string): Utm | null {
  const p = new URLSearchParams(search);
  return toUtm((k) => p.get(`utm_${k}`));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Lo guardado puede venir corrupto (otra versión, manipulado): se valida igual que lo de la URL. */
function parseStored(v: unknown): StoredTouch | null {
  if (!isObject(v) || typeof v.at !== 'string' || Number.isNaN(Date.parse(v.at)) || !isObject(v.utm)) return null;
  const utm = toUtm((k) => (v.utm as Record<string, unknown>)[k]);
  return utm ? { utm, at: v.at } : null;
}

/** Primera campaña dentro de la ventana; si no hay (o caducó), la de ahora. Puro: el reloj entra por parámetro. */
export function firstTouch(saved: unknown, current: Utm | null, now: Date): StoredTouch | null {
  const prev = parseStored(saved);
  const fresh = prev && now.getTime() - Date.parse(prev.at) <= ATTRIBUTION_MAX_AGE_DAYS * 86_400_000;
  if (prev && fresh) return prev;
  return current ? { utm: current, at: now.toISOString() } : null;
}

export function parseAttribution(v: unknown): Attribution {
  if (!isObject(v)) return EMPTY_ATTRIBUTION;
  const gaClientId = typeof v.gaClientId === 'string' && CLIENT_ID_RE.test(v.gaClientId) ? v.gaClientId : null;
  const gaSessionId = gaClientId && typeof v.gaSessionId === 'string' && SESSION_ID_RE.test(v.gaSessionId) ? v.gaSessionId : null;
  const utm = isObject(v.utm) ? toUtm((k) => (v.utm as Record<string, unknown>)[k]) : null;
  return { gaClientId, gaSessionId, utm };
}

/** Claves de metadata de Stripe (límite: 500 caracteres por valor; aquí nunca pasan de 100). */
export function attributionToMetadata(a: Attribution): Record<string, string> {
  const out: Record<string, string> = {};
  if (a.gaClientId) out.ga_cid = a.gaClientId;
  if (a.gaSessionId) out.ga_sid = a.gaSessionId;
  for (const k of UTM_KEYS) {
    const v = a.utm?.[k];
    if (v) out[`utm_${k}`] = v;
  }
  return out;
}

/** De vuelta desde el webhook. La metadata se puede editar en el panel de Stripe: se valida otra vez. */
export function attributionFromMetadata(meta: Record<string, string> | null | undefined): Attribution {
  if (!meta) return EMPTY_ATTRIBUTION;
  return parseAttribution({
    gaClientId: meta.ga_cid,
    gaSessionId: meta.ga_sid,
    utm: Object.fromEntries(UTM_KEYS.map((k) => [k, meta[`utm_${k}`]])),
  });
}
