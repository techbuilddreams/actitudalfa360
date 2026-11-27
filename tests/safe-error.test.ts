import { describe, expect, it } from 'vitest';
import { safeError } from '@/lib/safe-error.mjs';
import { compareSchema } from '@/infrastructure/db/schema-status';

/** Imita DrizzleQueryError: el mensaje lleva la consulta y TODOS los parámetros (correo, dirección…). */
const drizzleError = () => {
  const cause = Object.assign(new Error('value too long for type character varying(320)'), {
    name: 'PostgresError', code: '22001', severity: 'ERROR', detail: 'Failing row contains (cliente@correo.com, 1 Main St)',
  });
  return Object.assign(new Error('Failed query: insert into "orders" ... params: id,cliente@correo.com,+18095551234,1 Main St'), { name: 'DrizzleQueryError', cause });
};

describe('safeError (logs sin datos del cliente)', () => {
  it('un error de consulta con PII ⇒ solo código y mensaje de Postgres', () => {
    const out = safeError(drizzleError());
    const text = JSON.stringify(out);
    expect(out.code).toBe('22001');
    expect(text).not.toContain('cliente@correo.com');
    expect(text).not.toContain('Main St');
    expect(text).not.toContain('8095551234');
  });

  it('clase 22 (dato inválido: 22P02, 22003…) ⇒ solo el código: el mensaje repite el valor del cliente', () => {
    for (const code of ['22P02', '22003', '22001']) {
      const cause = Object.assign(new Error('invalid input syntax for type uuid: "Juana Perez, Calle Secreta 42"'), { name: 'PostgresError', code, severity: 'ERROR' });
      const out = safeError(Object.assign(new Error('Failed query: ...'), { cause }));
      expect(out.code).toBe(code);
      expect(JSON.stringify(out)).not.toContain('Juana');
    }
  });

  it('"Failed query" sin causa de Postgres: no se registra la consulta', () => {
    const out = safeError(new Error('Failed query: select ... params: cliente@correo.com'));
    expect(JSON.stringify(out)).not.toContain('cliente@correo.com');
  });

  it('una URL con credenciales dentro del mensaje se tacha', () => {
    const out = safeError(new TypeError('Invalid URL: postgres://u:SEC#RETO@h:5432/d'));
    expect(JSON.stringify(out)).not.toContain('SEC');
  });

  it('errores normales conservan su mensaje (truncado)', () => {
    expect(safeError(new Error('HTTP 500')).reason).toContain('HTTP 500');
    expect(safeError(new Error('x'.repeat(5000))).reason.length).toBeLessThanOrEqual(300);
    expect(safeError('raro')).toEqual({ reason: 'unknown' });
  });
});

describe('compareSchema (¿el esquema de la base es el que espera este código?)', () => {
  it('igual ⇒ ok', () => expect(compareSchema(200, 200)).toBe('ok'));
  it('la base no tiene la última migración ⇒ behind', () => expect(compareSchema(100, 200)).toBe('behind'));
  it('base sin migrar ⇒ behind', () => expect(compareSchema(null, 200)).toBe('behind'));
  it('la base va por delante (otra rama ya migró) ⇒ ahead', () => expect(compareSchema(300, 200)).toBe('ahead'));
});
