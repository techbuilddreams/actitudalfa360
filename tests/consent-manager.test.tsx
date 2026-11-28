// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { clearGaCookies, GTAG_SRC, loadGtag } from '@/components/consent/gtag';
import { CAMPAIGN_KEY } from '@/lib/attribution-client';
import { ConsentManager, type ConsentText } from '@/components/consent/consent-manager';
import { createAnalytics } from '@/lib/analytics';
import type { ConsentDecision } from '@/domain/consent';

type Win = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
const w = window as Win;
const calls = () => (w.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));

const text: ConsentText = {
  body: 'Usamos Google Analytics para saber qué páginas sirven.', policy: 'Qué medimos', accept: 'Aceptar', reject: 'Rechazar',
  preferences: 'Preferencias de cookies', label: 'Medición',
};
const ID = 'G-TEST123';
const decision = (d: Partial<ConsentDecision>): ConsentDecision => ({ analytics: false, showBanner: false, showPreferences: false, ...d });

function reset() {
  delete (window as unknown as Record<string, unknown>)[`ga-disable-G-TEST123`];
  delete w.dataLayer;
  delete w.gtag;
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  for (const c of document.cookie.split(';')) {
    const n = c.split('=')[0]?.trim();
    if (n) document.cookie = `${n}=; Max-Age=0; Path=/`;
  }
}
beforeEach(reset);
afterEach(() => { cleanup(); reset(); });

describe('loadGtag', () => {
  it('consentimiento por defecto ANTES de config: anuncios negados, analítica concedida', () => {
    loadGtag(ID);
    const c = calls();
    expect(c[0]).toEqual(['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' }]);
    expect(c.find((x) => x[0] === 'config')).toEqual(['config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: false }]);
  });
  it('dataLayer recibe objetos `arguments` (gtag.js ignora arrays)', () => {
    loadGtag(ID);
    expect(Object.prototype.toString.call(w.dataLayer![0])).toBe('[object Arguments]');
  });
  it('un solo <script> async a googletagmanager, aunque se llame dos veces', () => {
    loadGtag(ID);
    loadGtag(ID);
    const s = document.head.querySelectorAll(`script[src="${GTAG_SRC}?id=${ID}"]`);
    expect(s).toHaveLength(1);
    expect((s[0] as HTMLScriptElement).async).toBe(true);
    expect(calls().filter((x) => x[0] === 'config')).toHaveLength(1);
  });
});

describe('clearGaCookies', () => {
  it('también en el dominio padre (GA4 la pone en .actitudalfa360.com)', () => {
    const writes: string[] = [];
    const doc = { location: { hostname: 'www.actitudalfa360.com' }, get cookie() { return '_ga=GA1; x=1'; }, set cookie(v: string) { writes.push(v); } };
    clearGaCookies(doc as unknown as Document);
    expect(writes).toContain('_ga=; Max-Age=0; Path=/; Domain=.actitudalfa360.com');
    expect(writes).toContain('_ga=; Max-Age=0; Path=/');
    expect(writes.some((w) => w.startsWith('x='))).toBe(false);
  });
  it('borra _ga y _ga_* y deja las demás', () => {
    document.cookie = '_ga=GA1.1.1; Path=/';
    document.cookie = '_ga_TEST123=GS1; Path=/';
    document.cookie = 'otra=1; Path=/';
    clearGaCookies();
    expect(document.cookie).toBe('otra=1');
  });
});

describe('ConsentManager', () => {
  const setup = (d: Partial<ConsentDecision>, analytics = createAnalytics()) => {
    const load = vi.fn(loadGtag);
    const reload = vi.fn();
    render(<ConsentManager measurementId={ID} decision={decision(d)} text={text} analytics={analytics} load={load} reload={reload} />);
    return { analytics, load, reload };
  };

  it('con permiso: carga gtag y los eventos llegan como gtag("event", …)', () => {
    const { analytics, load } = setup({ analytics: true });
    expect(load).toHaveBeenCalledWith(ID);
    analytics.track({ name: 'sign_up', method: 'email', source: 'home' });
    expect(calls()).toContainEqual(['event', 'sign_up', { method: 'email', source: 'home' }]);
    expect(screen.queryByRole('region', { name: text.label })).toBeNull();
  });

  it('sin permiso y sin banner (GPC, o rechazó antes): ni carga ni manda, y tira la cola', () => {
    const { analytics, load } = setup({ analytics: false });
    analytics.track({ name: 'sign_up', method: 'email', source: 'home' });
    expect(load).not.toHaveBeenCalled();
    expect(w.dataLayer).toBeUndefined();
    expect(document.head.querySelector('script')).toBeNull();
  });

  it('banner: Aceptar y Rechazar con el mismo aspecto (rechazar tan fácil como aceptar)', () => {
    setup({ showBanner: true, showPreferences: true });
    const accept = screen.getByRole('button', { name: text.accept });
    const reject = screen.getByRole('button', { name: text.reject });
    expect(accept.className).toBe(reject.className);
    expect(screen.getByRole('link', { name: text.policy }).getAttribute('href')).toBe('/politicas#medicion');
  });

  it('mientras el banner espera, no sale nada a Google', () => {
    const { load } = setup({ showBanner: true, showPreferences: true });
    expect(load).not.toHaveBeenCalled();
    expect(w.dataLayer).toBeUndefined();
  });

  it('Aceptar: guarda la cookie, carga, manda lo que esperaba y cierra el banner', () => {
    const { analytics, load } = setup({ showBanner: true, showPreferences: true });
    analytics.track({ name: 'view_item', item: { item_id: 'T', item_name: 'Taza', priceCents: 1999, quantity: 1 } });
    fireEvent.click(screen.getByRole('button', { name: text.accept }));
    expect(document.cookie).toContain('aa_consent=v1.granted');
    expect(load).toHaveBeenCalledOnce();
    expect(calls().some((c) => c[0] === 'event' && c[1] === 'view_item')).toBe(true);
    expect(screen.queryByRole('region', { name: text.label })).toBeNull();
  });

  it('Rechazar: guarda la cookie, no carga y no manda lo que esperaba', () => {
    const { analytics, load } = setup({ showBanner: true, showPreferences: true });
    analytics.track({ name: 'sign_up', method: 'email', source: 'home' });
    fireEvent.click(screen.getByRole('button', { name: text.reject }));
    expect(document.cookie).toContain('aa_consent=v1.denied');
    expect(load).not.toHaveBeenCalled();
    expect(w.dataLayer).toBeUndefined();
    expect(screen.queryByRole('region', { name: text.label })).toBeNull();
  });

  it('Preferencias reabre el banner; retirar el permiso actualiza Google, borra _ga, corta los eventos y RECARGA (gtag.js fuera de memoria)', () => {
    const { analytics, reload } = setup({ analytics: true, showPreferences: true });
    document.cookie = '_ga=GA1.1.1; Path=/';
    fireEvent.click(screen.getByRole('button', { name: text.preferences }));
    fireEvent.click(screen.getByRole('button', { name: text.reject }));
    expect(calls()).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect(document.cookie).not.toContain('_ga=');
    expect(document.cookie).toContain('aa_consent=v1.denied');
    expect(reload).toHaveBeenCalledOnce();
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${ID}`]).toBe(true);
    const before = calls().length;
    analytics.track({ name: 'sign_up', method: 'email', source: 'home' });
    expect(calls()).toHaveLength(before);
  });

  it('rechazar sin haber cargado gtag no recarga, pero SÍ borra un _ga viejo (de otra visita)', () => {
    document.cookie = '_ga=GA1.viejo; Path=/';
    const { reload } = setup({ showBanner: true, showPreferences: true });
    fireEvent.click(screen.getByRole('button', { name: text.reject }));
    expect(reload).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('_ga=');
  });

  it('al montar sin permiso, un _ga viejo se borra', () => {
    document.cookie = '_ga=GA1.viejo; Path=/';
    setup({ analytics: false });
    expect(document.cookie).not.toContain('_ga=');
  });

  it('con permiso: un page_view propio con la URL saneada (config lleva send_page_view:false)', () => {
    window.history.replaceState(null, '', '/gracias?pedido=cs_live_secreto');
    setup({ analytics: true });
    const pv = calls().find((c) => c[0] === 'event' && c[1] === 'page_view');
    expect(pv?.[2]).toMatchObject({ page_location: `${window.location.origin}/gracias` });
    expect(JSON.stringify(calls())).not.toContain('cs_live');
    window.history.replaceState(null, '', '/');
  });

  it('rechazo guardado: lo que esperaba en la cola se tira al montar, y no sale aunque luego acepte', () => {
    const analytics = createAnalytics();
    analytics.track({ name: 'sign_up', method: 'email', source: 'home' });
    setup({ analytics: false, showPreferences: true }, analytics);
    fireEvent.click(screen.getByRole('button', { name: text.preferences }));
    fireEvent.click(screen.getByRole('button', { name: text.accept }));
    expect(calls().some((c) => c[0] === 'event')).toBe(false);
  });

  it('StrictMode (doble efecto en desarrollo): UN page_view por página', () => {
    render(<StrictMode><ConsentManager measurementId={ID} decision={decision({ analytics: true })} text={text} analytics={createAnalytics()} load={loadGtag} reload={() => {}} /></StrictMode>);
    expect(calls().filter((c) => c[0] === 'event' && c[1] === 'page_view')).toHaveLength(1);
  });

  it('fuera de la UE no hay enlace de preferencias ni banner', () => {
    setup({ analytics: true });
    expect(screen.queryByRole('button', { name: text.preferences })).toBeNull();
    expect(screen.queryByRole('button', { name: text.accept })).toBeNull();
  });
});

describe('ConsentManager — campaña de la primera visita', () => {
  const setup = (d: Partial<ConsentDecision>) =>
    render(<ConsentManager measurementId={ID} decision={decision(d)} text={text} analytics={createAnalytics()} load={vi.fn()} reload={vi.fn()} />);
  const saved = () => window.localStorage.getItem(CAMPAIGN_KEY);
  beforeEach(() => { window.localStorage.clear(); window.history.replaceState(null, '', '/?utm_source=tiktok&utm_campaign=reto'); });
  afterEach(() => { window.localStorage.clear(); window.history.replaceState(null, '', '/'); });

  it('con permiso al montar: la recuerda', () => {
    setup({ analytics: true });
    expect(JSON.parse(saved()!).utm).toMatchObject({ source: 'tiktok', campaign: 'reto' });
  });
  it('sin permiso: NO la recuerda, y borra una de antes', () => {
    window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ utm: { source: 'vieja' }, at: new Date().toISOString() }));
    setup({ analytics: false });
    expect(saved()).toBeNull();
  });
  it('mientras el banner espera: no la recuerda; al aceptar, sí', () => {
    setup({ showBanner: true, showPreferences: true });
    expect(saved()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: text.accept }));
    expect(JSON.parse(saved()!).utm.source).toBe('tiktok');
  });
  it('al retirar el permiso se olvida con las cookies', () => {
    setup({ analytics: true, showPreferences: true });
    fireEvent.click(screen.getByRole('button', { name: text.preferences }));
    fireEvent.click(screen.getByRole('button', { name: text.reject }));
    expect(saved()).toBeNull();
  });
});
