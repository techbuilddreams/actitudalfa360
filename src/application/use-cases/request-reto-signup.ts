import { DomainError } from '@/domain/errors';
import { normalizeEmail } from '@/domain/email';
import type { RetoSignup } from '../ports/reto-signup';

interface Deps {
  signup: RetoSignup;
  /** Zona IANA canónica, o null si no lo es. Inyectado para mantener el caso de uso puro (en el servidor, vía Intl). */
  canonicalTimeZone: (zone: string) => string | null;
}

/** Valida la entrada externa y pide el alta. Lanza DomainError (mensaje en español, seguro de mostrar). */
export function makeRequestRetoSignup({ signup, canonicalTimeZone }: Deps) {
  return async (raw: unknown): Promise<void> => {
    const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const email = normalizeEmail(o.email);
    if (!email) throw new DomainError('INVALID_INPUT', 'Escribe un correo válido.');
    // Lo que llega al puerto es la forma canónica, nunca lo que mandó el navegador.
    const timeZone = typeof o.timeZone === 'string' ? canonicalTimeZone(o.timeZone) : null;
    if (!timeZone) throw new DomainError('INVALID_INPUT', 'No pudimos reconocer tu zona horaria.');
    const source = o.source;
    if (source !== 'home' && source !== 'reto') throw new DomainError('INVALID_INPUT', 'Petición no válida.');
    // Ausente ⇒ false. Presente, solo true/false: un null no es «no» (es un cliente roto), y se rechaza.
    const interest = 'membershipInterest' in o ? o.membershipInterest : false;
    if (typeof interest !== 'boolean') throw new DomainError('INVALID_INPUT', 'Petición no válida.');
    await signup.request({ email, timeZone, source, membershipInterest: interest });
  };
}
