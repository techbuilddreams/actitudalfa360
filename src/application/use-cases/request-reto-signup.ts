import { DomainError } from '@/domain/errors';
import { normalizeEmail } from '@/domain/email';
import type { RetoSignup } from '../ports/reto-signup';

interface Deps {
  signup: RetoSignup;
  /** Inyectado para mantener el caso de uso puro (en el servidor, vía Intl). */
  isValidTimeZone: (zone: string) => boolean;
}

/** Valida la entrada externa y pide el alta. Lanza DomainError (mensaje en español, seguro de mostrar). */
export function makeRequestRetoSignup({ signup, isValidTimeZone }: Deps) {
  return async (raw: unknown): Promise<void> => {
    const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const email = normalizeEmail(o.email);
    if (!email) throw new DomainError('INVALID_INPUT', 'Escribe un correo válido.');
    const timeZone = o.timeZone;
    if (typeof timeZone !== 'string' || !isValidTimeZone(timeZone)) throw new DomainError('INVALID_INPUT', 'No pudimos reconocer tu zona horaria.');
    const source = o.source;
    if (source !== 'home' && source !== 'reto') throw new DomainError('INVALID_INPUT', 'Petición no válida.');
    const interest = o.membershipInterest ?? false;
    if (typeof interest !== 'boolean') throw new DomainError('INVALID_INPUT', 'Petición no válida.');
    await signup.request({ email, timeZone, source, membershipInterest: interest });
  };
}
