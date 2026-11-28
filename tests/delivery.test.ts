import { describe, expect, it } from 'vitest';
import { addBusinessDays, estimateDelivery } from '@/domain/delivery';
import { site } from '@/config/site';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('addBusinessDays', () => {
  it('n=0 devuelve la misma fecha', () => expect(addBusinessDays(d(2026, 11, 27), 0)).toEqual(d(2026, 11, 27)));
  it('salta sábado y domingo', () => expect(addBusinessDays(d(2026, 11, 27), 1)).toEqual(d(2026, 11, 30))); // vie -> lun
  it('empezando en fin de semana cuenta desde el lunes', () => {
    expect(addBusinessDays(d(2026, 11, 28), 1)).toEqual(d(2026, 11, 30)); // sáb +1 = lun
    expect(addBusinessDays(d(2026, 11, 29), 5)).toEqual(d(2026, 12, 4)); // dom +5 = vie
  });
  it('devuelve medianoche local aunque la hora de entrada no lo sea', () =>
    expect(addBusinessDays(new Date(2026, 10, 25, 23, 59), 1)).toEqual(d(2026, 11, 26)));
  it('cruza meses y años', () => expect(addBusinessDays(d(2026, 12, 31), 2)).toEqual(d(2027, 1, 4)));
});

describe('estimateDelivery', () => {
  it('con site.shipping: +5 y +12 días hábiles', () => {
    const r = estimateDelivery(d(2026, 11, 27), site.shipping);
    expect(r.from).toEqual(d(2026, 12, 4));
    expect(r.to).toEqual(d(2026, 12, 15));
  });
});
