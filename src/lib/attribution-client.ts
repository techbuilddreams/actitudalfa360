import { firstTouch, gaClientIdFromCookie, gaSessionIdFromCookie, parseAttribution, utmFromSearch, type Attribution } from '@/domain/attribution';

/**
 * Borde del NAVEGADOR de la atribución. Solo se usa con la medición encendida (lo decide quien llama).
 * Lee las cookies de GA4 y recuerda la campaña de la primera visita en localStorage (90 días).
 * Nunca lanza: Safari privado o un almacenamiento bloqueado dejan la compra sin campaña, no la página rota.
 */
export const CAMPAIGN_KEY = 'aa360_campaign';

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const browserStorage = (): KV | null => {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
};

function readSaved(storage: KV | null): unknown {
  try {
    const raw = storage?.getItem(CAMPAIGN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Al encender la medición en una página: guarda su campaña si es la primera (o la anterior caducó). */
export function rememberCampaign({ search = typeof window === 'undefined' ? '' : window.location.search, storage = browserStorage(), now = new Date() }: { search?: string; storage?: KV | null; now?: Date } = {}): void {
  const touch = firstTouch(readSaved(storage), utmFromSearch(search), now);
  try {
    if (touch) storage?.setItem(CAMPAIGN_KEY, JSON.stringify(touch));
    else storage?.removeItem(CAMPAIGN_KEY);
  } catch { /* sin almacenamiento, sin campaña */ }
}

/** Al retirar el permiso, la campaña se va con las cookies de GA4. */
export function forgetCampaign(storage: KV | null = browserStorage()): void {
  try { storage?.removeItem(CAMPAIGN_KEY); } catch { /* nada que borrar */ }
}

const cookieValue = (cookie: string, match: (name: string) => boolean): string | undefined => {
  for (const part of cookie.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && match(part.slice(0, i).trim())) return part.slice(i + 1).trim();
  }
  return undefined;
};

/** Lo que viaja con el pago. Validado con las mismas reglas que aplica el servidor. */
export function currentAttribution({ cookie = typeof document === 'undefined' ? '' : document.cookie, storage = browserStorage(), now = new Date() }: { cookie?: string; storage?: KV | null; now?: Date } = {}): Attribution {
  const touch = firstTouch(readSaved(storage), null, now);
  return parseAttribution({
    gaClientId: gaClientIdFromCookie(cookieValue(cookie, (n) => n === '_ga')),
    // Una sola propiedad de GA4 en este dominio: su cookie es la única _ga_<contenedor>.
    gaSessionId: gaSessionIdFromCookie(cookieValue(cookie, (n) => n.startsWith('_ga_'))),
    utm: touch?.utm ?? null,
  });
}
