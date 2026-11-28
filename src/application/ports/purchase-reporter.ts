import type { Order } from '@/domain/order';

/** La visita de GA4 a la que pertenece la compra (nunca se guarda: solo viaja para este aviso). */
export interface PurchaseVisit {
  readonly clientId: string;
  readonly sessionId: string | null;
}

/** Avisa a la analítica de una compra YA cobrada y guardada. Sin datos de contacto: ni correo, ni nombre, ni dirección. */
export interface PurchaseReporter {
  reportPurchase(order: Order, visit: PurchaseVisit): Promise<void>;
}

/** Ejecuta una tarea DESPUÉS de responder (en Next: `after`). La respuesta a Stripe nunca espera a la analítica. */
export type Defer = (task: () => Promise<void>) => void;
