import { createHash } from 'node:crypto';
import type { Logger } from '@/application/ports/logger';
import type { RetoSignup, RetoSignupInput } from '@/application/ports/reto-signup';

/** Adaptador de F2: solo deja constancia en el log. Nunca registra el correo: va un hash truncado. */
export class LogRetoSignup implements RetoSignup {
  constructor(private readonly logger: Logger) {}

  async request({ email, timeZone, source }: RetoSignupInput): Promise<void> {
    const emailHash = createHash('sha256').update(email).digest('hex').slice(0, 12);
    this.logger.info('reto_signup_requested', { emailHash, timeZone, source });
  }
}
