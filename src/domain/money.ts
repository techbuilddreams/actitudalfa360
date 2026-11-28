/** Dinero en centavos enteros: nunca floats para precios. */
export type Currency = 'usd';

export interface Money {
  readonly cents: number;
  readonly currency: Currency;
}

export const usd = (cents: number): Money => {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError(`Monto inválido: ${cents}`);
  return { cents, currency: 'usd' };
};

export const addMoney = (a: Money, b: Money): Money => usd(a.cents + b.cents);
export const multiplyMoney = (m: Money, qty: number): Money => usd(m.cents * qty);

export const formatMoney = (m: Money): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency.toUpperCase() }).format(m.cents / 100);

export const toDecimalString = (m: Money): string => (m.cents / 100).toFixed(2);

/** Precio de cartel: «$12» cuando no hay centavos, «$12.50» cuando sí. Nunca redondea: solo quita un .00 exacto. */
export const formatMoneyShort = (m: Money): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency.toUpperCase(), minimumFractionDigits: m.cents % 100 === 0 ? 0 : 2 }).format(m.cents / 100);
