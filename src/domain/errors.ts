/** Errores de negocio: se muestran al cliente con un mensaje seguro. */
export class DomainError extends Error {
  constructor(
    readonly code: 'UNKNOWN_SKU' | 'INVALID_QUANTITY' | 'EMPTY_CART' | 'TOO_MANY_LINES' | 'UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

/** La firma del webhook no es válida (petición falsa o secreto equivocado): responder 400. */
export class InvalidWebhookError extends Error {
  constructor() {
    super('Firma de webhook inválida');
    this.name = 'InvalidWebhookError';
  }
}

/** Otro proceso está trabajando en este pedido: responder 5xx para que el proveedor reintente más tarde. */
export class RetryLaterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryLaterError';
  }
}
