export interface RetoSignupInput {
  email: string;
  timeZone: string;
  source: 'home' | 'reto';
  /** Marcó «Avísame también cuando abra la membresía». */
  membershipInterest: boolean;
}

/** Alta en la lista del reto. F2: solo se registra; F3: suscriptores + doble opt-in. */
export interface RetoSignup {
  request(input: RetoSignupInput): Promise<void>;
}
