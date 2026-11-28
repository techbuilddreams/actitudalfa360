import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_MAX_AGE_DAYS,
  attributionFromMetadata,
  attributionToMetadata,
  firstTouch,
  gaClientIdFromCookie,
  gaSessionIdFromCookie,
  parseAttribution,
  utmFromSearch,
} from '@/domain/attribution';

describe('gaClientIdFromCookie (_ga)', () => {
  it('GA1.1.<aleatorio>.<segundos> ⇒ los dos últimos números', () =>
    expect(gaClientIdFromCookie('GA1.1.1234567890.1700000000')).toBe('1234567890.1700000000'));
  it('dominio de más niveles (GA1.2.…) también', () =>
    expect(gaClientIdFromCookie('GA1.2.987654321.1699999999')).toBe('987654321.1699999999'));
  it('basura o vacío ⇒ null', () => {
    for (const v of [undefined, '', 'GA1.1', 'GA1.1.abc.def', 'x.y.1.2"><script>', 'GA1.1.1.2.3']) expect(gaClientIdFromCookie(v), String(v)).toBeNull();
  });
});

describe('gaSessionIdFromCookie (_ga_<contenedor>)', () => {
  it('formato GS1: el tercer campo', () => expect(gaSessionIdFromCookie('GS1.1.1700000123.3.1.1700000200.0.0.0')).toBe('1700000123'));
  it('formato GS2 (2025): el campo s', () => expect(gaSessionIdFromCookie('GS2.1.s1700000123$o3$g1$t1700000200$j0$l0$h0')).toBe('1700000123'));
  it('basura ⇒ null', () => {
    for (const v of [undefined, '', 'GS1.1', 'GS2.1.o3$g1', 'GS1.1.abc.1']) expect(gaSessionIdFromCookie(v), String(v)).toBeNull();
  });
});

describe('utmFromSearch', () => {
  it('lee los cinco utm_*', () =>
    expect(utmFromSearch('?utm_source=tiktok&utm_medium=social&utm_campaign=reto&utm_term=disciplina&utm_content=v1&x=1')).toEqual({
      source: 'tiktok', medium: 'social', campaign: 'reto', term: 'disciplina', content: 'v1',
    }));
  it('sin utm_source no hay campaña (GA4 tampoco la cuenta)', () => expect(utmFromSearch('?utm_medium=social')).toBeNull());
  it('sin query ⇒ null', () => expect(utmFromSearch('')).toBeNull());
  it('recorta, limita a 100 y quita caracteres de control', () => {
    const u = utmFromSearch(`?utm_source=${encodeURIComponent('  ig\u0000\n ')}&utm_campaign=${'a'.repeat(300)}`);
    expect(u?.source).toBe('ig');
    expect(u?.campaign).toHaveLength(100);
    expect(u?.medium).toBeNull();
  });
});

describe('firstTouch', () => {
  const now = new Date('2026-11-28T12:00:00Z');
  const saved = { utm: { source: 'tiktok', medium: null, campaign: null, term: null, content: null }, at: '2026-11-20T00:00:00.000Z' };
  it('la primera campaña gana: una visita posterior con otra UTM no la pisa', () =>
    expect(firstTouch(saved, { source: 'ig', medium: null, campaign: null, term: null, content: null }, now)).toEqual(saved));
  it('sin nada guardado, guarda la de ahora con su fecha', () =>
    expect(firstTouch(null, saved.utm, now)).toEqual({ utm: saved.utm, at: now.toISOString() }));
  it(`pasados ${ATTRIBUTION_MAX_AGE_DAYS} días caduca: la nueva entra, o no queda nada`, () => {
    const old = { ...saved, at: '2026-08-01T00:00:00.000Z' };
    expect(firstTouch(old, null, now)).toBeNull();
    expect(firstTouch(old, { ...saved.utm, source: 'ig' }, now)?.utm.source).toBe('ig');
  });
  it('lo guardado corrupto se descarta', () => {
    expect(firstTouch({ utm: { source: 5 }, at: 'nope' } as never, null, now)).toBeNull();
    expect(firstTouch('{"x":1}' as never, null, now)).toBeNull();
  });
});

describe('parseAttribution (lo que llega del navegador: entrada externa)', () => {
  it('acepta lo bien formado', () =>
    expect(parseAttribution({ gaClientId: '123.456', gaSessionId: '1700000123', utm: { source: 'tiktok' } })).toEqual({
      gaClientId: '123.456', gaSessionId: '1700000123', utm: { source: 'tiktok', medium: null, campaign: null, term: null, content: null },
    }));
  it('descarta campo a campo lo mal formado, sin rechazar el pago', () =>
    expect(parseAttribution({ gaClientId: 'a@b.com', gaSessionId: 'x', utm: { medium: 'cpc' } })).toEqual({ gaClientId: null, gaSessionId: null, utm: null }));
  it('cualquier otra cosa ⇒ vacía', () => {
    for (const v of [undefined, null, 'x', 5, []]) expect(parseAttribution(v)).toEqual({ gaClientId: null, gaSessionId: null, utm: null });
  });
  it('sin client_id no hay session_id que valga (no se puede atribuir a nadie)', () =>
    expect(parseAttribution({ gaSessionId: '1700000123' }).gaSessionId).toBeNull());
});

describe('metadata de Stripe (ida y vuelta)', () => {
  const a = { gaClientId: '123.456', gaSessionId: '1700000123', utm: { source: 'tiktok', medium: 'social', campaign: null, term: null, content: null } };
  it('solo escribe claves con valor', () =>
    expect(attributionToMetadata(a)).toEqual({ ga_cid: '123.456', ga_sid: '1700000123', utm_source: 'tiktok', utm_medium: 'social' }));
  it('vacía ⇒ ninguna clave', () => expect(attributionToMetadata({ gaClientId: null, gaSessionId: null, utm: null })).toEqual({}));
  it('vuelve igual', () => expect(attributionFromMetadata(attributionToMetadata(a))).toEqual(a));
  it('al volver se valida de nuevo (la metadata la pudo editar alguien en el panel)', () =>
    expect(attributionFromMetadata({ ga_cid: 'x', utm_source: 'y'.repeat(200) })).toEqual({
      gaClientId: null, gaSessionId: null, utm: { source: 'y'.repeat(100), medium: null, campaign: null, term: null, content: null },
    }));
  it('sin metadata ⇒ vacía', () => expect(attributionFromMetadata(null)).toEqual({ gaClientId: null, gaSessionId: null, utm: null }));
});
