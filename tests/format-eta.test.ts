import { describe, expect, it } from 'vitest';
import { formatEtaRange } from '@/lib/format-eta';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('formatEtaRange', () => {
  it('mismo mes: el mes solo en el final', () =>
    expect(formatEtaRange(d(2026, 12, 4), d(2026, 12, 15))).toEqual({ from: 'vie. 4', to: 'mar. 15 de dic.' }));
  it('meses distintos: mes en ambos', () =>
    expect(formatEtaRange(d(2026, 12, 29), d(2027, 1, 6))).toEqual({ from: 'mar. 29 de dic.', to: 'mié. 6 de ene.' }));
  it('un solo punto tras la abreviatura, sin dobles', () => {
    const r = formatEtaRange(d(2026, 9, 7), d(2026, 9, 16));
    expect(r.to).not.toMatch(/\.\./);
    expect(r.to).toBe('mié. 16 de sep.');
  });
});
