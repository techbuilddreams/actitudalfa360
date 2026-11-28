/**
 * Carga de GA4 (gtag.js). Solo se llama CON permiso: sin él no sale ninguna petición a Google
 * (modo «básico» de Consent Mode; el modelado de los pings sin cookies no compensa a esta escala).
 * El <script> lo crea código ya autorizado por el nonce, así que 'strict-dynamic' lo deja pasar.
 */

export const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js';

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

export function loadGtag(measurementId: string, win: GtagWindow = window, doc: Document = document): void {
  if (win.gtag) return;
  win.dataLayer = win.dataLayer ?? [];
  // gtag.js solo procesa objetos `arguments`, no arrays: por eso `function` y no una flecha con ...rest.
  win.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    win.dataLayer!.push(arguments);
  };
  // Sin anuncios: los tres permisos de anuncios quedan negados siempre. Va ANTES de config.
  win.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  win.gtag('js', new Date());
  // send_page_view:false ⇒ el page_view lo mandamos nosotros, con la URL saneada (`safeLocation`).
  win.gtag('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: false });
  const s = doc.createElement('script');
  s.async = true;
  s.src = `${GTAG_SRC}?id=${encodeURIComponent(measurementId)}`;
  doc.head.appendChild(s);
}

export const gtagEvent = (name: string, params: Record<string, unknown>, win: GtagWindow = window) => win.gtag?.('event', name, params);

/** Al retirar el permiso: dice a Google que pare, activa su apagado documentado (`ga-disable-<ID>`) y borra sus cookies. */
export function revokeGtag(measurementId: string, win: GtagWindow = window): void {
  win.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  (win as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
  clearGaCookies();
}

/** Borra `_ga` y `_ga_*` en el host y en el dominio padre (GA4 las pone en el dominio más alto posible). */
export function clearGaCookies(doc: Document = document): void {
  const host = doc.location?.hostname ?? '';
  const parts = host.split('.');
  const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.')).filter((d) => d.includes('.'))];
  for (const c of doc.cookie.split(';')) {
    const name = c.split('=')[0]?.trim() ?? '';
    if (name !== '_ga' && !name.startsWith('_ga_')) continue;
    for (const d of domains) doc.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=.${d}` : ''}`;
  }
}
