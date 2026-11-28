import { DomainError } from './errors';

/** Líneas del kit de dos piezas. El producto actual va PRIMERO: el checkout cancela de vuelta a `lines[0]`. */
export function kitItems(currentSku: string, otherSku: string) {
  const a = currentSku.trim();
  const b = otherSku.trim();
  if (!a || !b) throw new DomainError('UNKNOWN_SKU', 'Falta una pieza del kit.');
  if (a === b) throw new DomainError('INVALID_KIT', 'El kit necesita dos piezas distintas.');
  return [
    { sku: a, quantity: 1 },
    { sku: b, quantity: 1 },
  ] as const;
}
