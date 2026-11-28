import type { Logger } from '@/application/ports/logger';
import type { RetoSignup, RetoSignupInput } from '@/application/ports/reto-signup';

/**
 * Adaptador de F2: solo deja constancia en el log. Nada derivado del correo, ni un hash: un hash sin sal
 * se revierte con una lista de correos conocidos, y el log no es un lugar para datos personales.
 */
export class LogRetoSignup implements RetoSignup {
  constructor(private readonly logger: Logger) {}

  async request({ timeZone, source, membershipInterest }: RetoSignupInput): Promise<void> {
    this.logger.info('reto_signup_requested', { source, timeZone, membershipInterest, outcome: 'logged' });
  }
}
