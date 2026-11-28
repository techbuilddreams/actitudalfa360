import { describe, expect, it } from 'vitest';
import { formatMoneyShort, usd } from '@/domain/money';

describe('formatMoneyShort (precio de cartel)', () => {
  it.each([[1200, '$12'], [0, '$0'], [100000, '$1,000'], [1250, '$12.50'], [1201, '$12.01'], [2499, '$24.99'], [5, '$0.05']])(
    '%i centavos → %s (quita .00 solo si los centavos son 0)', (cents, out) => expect(formatMoneyShort(usd(cents))).toBe(out));
});
