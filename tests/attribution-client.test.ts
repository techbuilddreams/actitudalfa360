import { describe, expect, it } from 'vitest';
import { CAMPAIGN_KEY, currentAttribution, forgetCampaign, rememberCampaign } from '@/lib/attribution-client';
import { createAnalytics } from '@/lib/analytics';

/** Storage de mentira; `broken` simula Safari privado / almacenamiento bloqueado (lanza en cada acceso). */
function fakeStorage(broken = false) {
  const m = new Map<string, string>();
  const guard = () => { if (broken) throw new DOMException('bloqueado', 'SecurityError'); };
  return {
    map: m,
    getItem: (k: string) => { guard(); return m.get(k) ?? null; },
    setItem: (k: string, v: string) => { guard(); m.set(k, v); },
    removeItem: (k: string) => { guard(); m.delete(k); },
  };
}
const now = new Date('2026-11-28T12:00:00Z');
const cookies = '_ga=GA1.1.1234567890.1700000000; aa360_consent=v1.granted; _ga_AB12CD34EF=GS2.1.s1700000123$o3$g1$t1700000200$j0$l0$h0';

describe('rememberCampaign', () => {
  it('guarda la campaña de la URL con su fecha', () => {
    const s = fakeStorage();
    rememberCampaign({ search: '?utm_source=tiktok&utm_campaign=reto', storage: s, now });
    expect(JSON.parse(s.map.get(CAMPAIGN_KEY)!)).toEqual({ utm: { source: 'tiktok', medium: null, campaign: 'reto', term: null, content: null }, at: now.toISOString() });
  });
  it('la primera campaña no se pisa', () => {
    const s = fakeStorage();
    rememberCampaign({ search: '?utm_source=tiktok', storage: s, now });
    rememberCampaign({ search: '?utm_source=ig', storage: s, now });
    expect(JSON.parse(s.map.get(CAMPAIGN_KEY)!).utm.source).toBe('tiktok');
  });
  it('caducada y sin campaña nueva ⇒ se borra', () => {
    const s = fakeStorage();
    s.map.set(CAMPAIGN_KEY, JSON.stringify({ utm: { source: 'x' }, at: '2026-01-01T00:00:00.000Z' }));
    rememberCampaign({ search: '', storage: s, now });
    expect(s.map.has(CAMPAIGN_KEY)).toBe(false);
  });
  it('JSON roto ⇒ se reemplaza, no lanza', () => {
    const s = fakeStorage();
    s.map.set(CAMPAIGN_KEY, '{roto');
    expect(() => rememberCampaign({ search: '?utm_source=ig', storage: s, now })).not.toThrow();
    expect(JSON.parse(s.map.get(CAMPAIGN_KEY)!).utm.source).toBe('ig');
  });
  it('almacenamiento bloqueado ⇒ no lanza (la medición nunca rompe la página)', () =>
    expect(() => rememberCampaign({ search: '?utm_source=ig', storage: fakeStorage(true), now })).not.toThrow());
});

describe('currentAttribution', () => {
  it('lee client_id, session_id y la campaña guardada', () => {
    const s = fakeStorage();
    rememberCampaign({ search: '?utm_source=tiktok', storage: s, now });
    expect(currentAttribution({ cookie: cookies, storage: s, now })).toEqual({
      gaClientId: '1234567890.1700000000', gaSessionId: '1700000123',
      utm: { source: 'tiktok', medium: null, campaign: null, term: null, content: null },
    });
  });
  it('sin cookies de GA ni campaña ⇒ todo null', () =>
    expect(currentAttribution({ cookie: 'aa360_consent=v1.granted', storage: fakeStorage(), now })).toEqual({ gaClientId: null, gaSessionId: null, utm: null }));
  it('una campaña caducada no viaja', () => {
    const s = fakeStorage();
    s.map.set(CAMPAIGN_KEY, JSON.stringify({ utm: { source: 'x' }, at: '2026-01-01T00:00:00.000Z' }));
    expect(currentAttribution({ cookie: '', storage: s, now }).utm).toBeNull();
  });
  it('almacenamiento bloqueado ⇒ sin campaña, pero los IDs sí', () =>
    expect(currentAttribution({ cookie: cookies, storage: fakeStorage(true), now }).gaClientId).toBe('1234567890.1700000000'));
});

describe('forgetCampaign (al retirar el permiso)', () => {
  it('borra la campaña; bloqueado no lanza', () => {
    const s = fakeStorage();
    rememberCampaign({ search: '?utm_source=tiktok', storage: s, now });
    forgetCampaign(s);
    expect(s.map.has(CAMPAIGN_KEY)).toBe(false);
    expect(() => forgetCampaign(fakeStorage(true))).not.toThrow();
  });
});

describe('Analytics.isEnabled (lo que decide si la atribución viaja con el pago)', () => {
  it('pendiente y apagada ⇒ false; encendida ⇒ true; retirada ⇒ false', () => {
    const a = createAnalytics({ currentPage: () => '/' });
    expect(a.isEnabled()).toBe(false);
    a.enable(() => {});
    expect(a.isEnabled()).toBe(true);
    a.disable();
    expect(a.isEnabled()).toBe(false);
  });
});
