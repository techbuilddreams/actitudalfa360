'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, serializeConsentCookie, type ConsentChoice, type ConsentDecision } from '@/domain/consent';
import { analytics as pageAnalytics, type Analytics } from '@/lib/analytics';
import { clearGaCookies, gtagEvent, loadGtag, revokeGtag } from './gtag';

/** Textos (copy.json → `consent`). */
export interface ConsentText { label: string; body: string; policy: string; accept: string; reject: string; preferences: string }

interface Props {
  measurementId: string;
  /** Lo decidió el servidor con país, GPC y cookie (`resolveConsent`): sin parpadeo del banner. */
  decision: ConsentDecision;
  text: ConsentText;
  analytics?: Analytics;
  load?: (id: string) => void;
  /** Recarga tras retirar el permiso (inyectable en tests). */
  reload?: () => void;
}

function remember(choice: ConsentChoice) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${serializeConsentCookie(choice)}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86_400}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Enciende o apaga la medición. En la UE: banner con Aceptar y Rechazar iguales, y «Preferencias de cookies»
 * en el pie para cambiar de idea. Fuera: nada visible (GPC ya llega resuelto por el servidor).
 */
export function ConsentManager({ measurementId, decision, text: t, analytics = pageAnalytics, load = loadGtag, reload = () => window.location.reload() }: Props) {
  const [open, setOpen] = useState(decision.showBanner);
  const loaded = useRef(false);

  const start = () => {
    if (!loaded.current) load(measurementId);
    loaded.current = true;
    analytics.enable(gtagEvent);
  };

  useEffect(() => {
    if (decision.analytics) start();
    else {
      // Un _ga de otra visita (otra región, o elección caducada) no se queda sin permiso.
      clearGaCookies();
      if (!decision.showBanner) analytics.disable();
    }
    // Solo al montar: la decisión del servidor es la de esta carga de página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // page_view propio en cada página (también en la navegación en cliente). Va DESPUÉS del efecto de arriba.
  const pathname = usePathname();
  useEffect(() => {
    analytics.track({ name: 'page_view', location: window.location.href, title: document.title });
  }, [pathname, analytics]);

  const choose = (choice: ConsentChoice) => {
    remember(choice);
    setOpen(false);
    if (choice === 'granted') return start();
    analytics.disable();
    clearGaCookies();
    if (!loaded.current) return;
    // gtag.js sigue en memoria y podría mandar pings sin cookies: se avisa a Google, se borra _ga y se recarga.
    // Al volver, el servidor lee la cookie y no carga nada. Por eso «re-aceptar en la misma página» no existe.
    revokeGtag(measurementId);
    reload();
  };

  return (
    <>
      {decision.showPreferences && (
        <button type="button" className="linkish" onClick={() => setOpen(true)}>{t.preferences}</button>
      )}
      {open && (
        <div className="consent" role="region" aria-label={t.label}>
          <p>{t.body} <Link href="/politicas#medicion">{t.policy}</Link>.</p>
          <div className="consent-actions">
            <button type="button" className="btn sm" onClick={() => choose('denied')}>{t.reject}</button>
            <button type="button" className="btn sm" onClick={() => choose('granted')}>{t.accept}</button>
          </div>
        </div>
      )}
    </>
  );
}

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] }
}
