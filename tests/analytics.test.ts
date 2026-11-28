import { describe, expect, it, vi } from 'vitest';
import { checkoutItems, createAnalytics, safeLocation, toGtag, type AnalyticsEvent, type Sink } from '@/lib/analytics';

/** Sink falso que RECHAZA lo que GA4 no acepta (lección de Tabla Jaladora: un booleano se pierde en silencio). */
function strictSink() {
  const calls: [string, Record<string, unknown>][] = [];
  const scalar = (v: unknown) => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
  const sink: Sink = (name, params) => {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(name)) throw new Error(`nombre inválido: ${name}`);
    for (const [k, v] of Object.entries(params)) {
      if (k === 'items') {
        for (const it of v as Record<string, unknown>[]) for (const [ik, iv] of Object.entries(it)) if (!scalar(iv)) throw new Error(`items.${ik} no escalar`);
      } else if (!scalar(v)) throw new Error(`${k} no escalar`);
    }
    if (JSON.stringify(params).includes('@')) throw new Error('PII: parece un correo');
    calls.push([name, params]);
  };
  return { sink, calls };
}

const taza = { item_id: 'TAZA-15', item_name: 'Taza', priceCents: 1999, quantity: 2 };
const vaso = { item_id: 'VASO-20', item_name: 'Vaso', priceCents: 2950, quantity: 1 };

describe('toGtag', () => {
  it('view_item: valor en dólares desde centavos, moneda, un item', () =>
    expect(toGtag({ name: 'view_item', item: { ...taza, quantity: 1 } })).toEqual([
      'view_item',
      { currency: 'USD', value: 19.99, items: [{ item_id: 'TAZA-15', item_name: 'Taza', price: 19.99, quantity: 1 }] },
    ]));
  it('begin_checkout: suma de precio × cantidad, sin errores de float', () => {
    const [, p] = toGtag({ name: 'begin_checkout', items: [taza, vaso] });
    expect(p.value).toBe(69.48);
    expect(p.currency).toBe('USD');
    expect(p.items).toHaveLength(2);
  });
  it('sign_up: método y origen; nada más', () =>
    expect(toGtag({ name: 'sign_up', method: 'email', source: 'reto' })).toEqual(['sign_up', { method: 'email', source: 'reto' }]));
  it('todo lo que produce pasa el sink estricto', () => {
    const { sink } = strictSink();
    const evs: AnalyticsEvent[] = [
      { name: 'view_item', item: taza },
      { name: 'begin_checkout', items: [taza, vaso] },
      { name: 'sign_up', method: 'email', source: 'home' },
    ];
    for (const e of evs) expect(() => sink(...toGtag(e))).not.toThrow();
  });
});

describe('checkoutItems', () => {
  const cat = { 'TAZA-15': { name: 'Taza', priceCents: 1999 }, 'VASO-20': { name: 'Vaso', priceCents: 2950 } };
  it('cruza sku y cantidad con el precio del catálogo', () =>
    expect(checkoutItems([{ sku: 'TAZA-15', quantity: 2 }, { sku: 'VASO-20', quantity: 1 }], cat)).toEqual([taza, vaso]));
  it('un sku que no está en el catálogo se omite (no se inventa precio)', () =>
    expect(checkoutItems([{ sku: 'X', quantity: 1 }, { sku: 'VASO-20', quantity: 1 }], cat)).toEqual([vaso]));
});

describe('createAnalytics', () => {
  const ev: AnalyticsEvent = { name: 'sign_up', method: 'email', source: 'home' };

  it('antes de decidir: guarda; al aceptar, manda en orden', () => {
    const a = createAnalytics();
    a.track({ name: 'view_item', item: taza });
    a.track(ev);
    const { sink, calls } = strictSink();
    a.enable(sink);
    expect(calls.map((c) => c[0])).toEqual(['view_item', 'sign_up']);
    a.track(ev);
    expect(calls).toHaveLength(3);
  });
  it('al rechazar: tira la cola y no manda nada después', () => {
    const a = createAnalytics();
    a.track(ev);
    a.disable();
    a.track(ev);
    const { sink, calls } = strictSink();
    a.enable(sink);
    expect(calls).toHaveLength(0);
  });
  it('retirar el permiso corta el envío', () => {
    const a = createAnalytics();
    const { sink, calls } = strictSink();
    a.enable(sink);
    a.track(ev);
    a.disable();
    a.track(ev);
    expect(calls).toHaveLength(1);
  });
  it('la cola tiene tope: una página abierta horas sin decidir no crece sin fin', () => {
    const a = createAnalytics({ maxQueue: 3 });
    for (let i = 0; i < 10; i++) a.track(ev);
    const { sink, calls } = strictSink();
    a.enable(sink);
    expect(calls).toHaveLength(3);
  });
  it('nunca lanza: un sink que explota no rompe la compra', () => {
    const a = createAnalytics();
    a.enable(() => { throw new Error('gtag roto'); });
    expect(() => a.track(ev)).not.toThrow();
  });
  it('enable dos veces no duplica la cola', () => {
    const a = createAnalytics();
    a.track(ev);
    const s = vi.fn();
    a.enable(s);
    a.enable(s);
    expect(s).toHaveBeenCalledTimes(1);
  });
});

describe('safeLocation (lo único de la URL que sale hacia Google)', () => {
  it('quita la query: el ID de sesión de Stripe en /gracias es una llave', () =>
    expect(safeLocation('https://actitudalfa360.com/gracias?pedido=cs_live_abc123')).toBe('https://actitudalfa360.com/gracias'));
  it('conserva solo utm_* (el origen de la visita) y quita el resto, y el hash', () =>
    expect(safeLocation('https://a.com/p?email=ana%40x.com&utm_source=tiktok&utm_campaign=reto&gclid=1#x'))
      .toBe('https://a.com/p?utm_source=tiktok&utm_campaign=reto'));
  it('una URL rota no lanza: devuelve vacío', () => expect(safeLocation('::')).toBe(''));
});

describe('page_view', () => {
  it('se manda con la URL ya saneada', () =>
    expect(toGtag({ name: 'page_view', location: 'https://a.com/gracias?pedido=cs_x', title: 'Gracias' }))
      .toEqual(['page_view', { page_location: 'https://a.com/gracias', page_title: 'Gracias' }]));
});

describe('cola: solo la página en la que se acepta', () => {
  it('lo que esperaba de páginas anteriores no sale al aceptar (no se midió antes del permiso)', () => {
    let page = '/a';
    const a = createAnalytics({ currentPage: () => page });
    a.track({ name: 'sign_up', method: 'email', source: 'home' });
    page = '/b';
    a.track({ name: 'sign_up', method: 'email', source: 'reto' });
    const { sink, calls } = strictSink();
    a.enable(sink);
    expect(calls).toEqual([['sign_up', { method: 'email', source: 'reto' }]]);
  });
});
