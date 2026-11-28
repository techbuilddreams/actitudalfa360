import { site } from '@/config/site';

/** Frases de la política de envíos y devoluciones: UNA fuente para /politicas y /llms.txt. */
export function policyPhrases() {
  const { handlingDays: h, transitDays: t } = site.shipping;
  return {
    onlyUs: 'solo dentro de Estados Unidos',
    handling: `${h.min}–${h.max} días hábiles`,
    transit: `${t.min}–${t.max} días hábiles`,
    noReturns: 'no aceptamos devoluciones por cambio de opinión',
    defectKinds: 'dañado, defectuoso o equivocado',
    defectWindow: `dentro de los ${site.returns.days} días siguientes a la entrega`,
  } as const;
}
