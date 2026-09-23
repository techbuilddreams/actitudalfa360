import { priceCart, type CartLineInput, type PricedCart } from '@/domain/cart';
import type { Money } from '@/domain/money';
import type { CatalogRepository } from '../ports/catalog';
import type { PaymentGateway } from '../ports/payment-gateway';

export interface CreateCheckoutDeps {
  catalog: CatalogRepository;
  payments: PaymentGateway;
  shippingFor: (cart: PricedCart) => Money;
  siteUrl: string;
}

/** Caso de uso: convertir un carrito en una sesión de pago segura. */
export function makeCreateCheckout(deps: CreateCheckoutDeps) {
  return async (lines: readonly CartLineInput[]): Promise<{ url: string }> => {
    const cart = priceCart(lines, (sku) => deps.catalog.findVariant(sku));
    return deps.payments.createCheckout({
      cart,
      shipping: deps.shippingFor(cart),
      successUrl: `${deps.siteUrl}/gracias?pedido={CHECKOUT_SESSION_ID}`,
      // Si cancela, vuelve a la pieza que estaba viendo (o a la tienda si llevaba varias).
      cancelUrl: cart.lines.length === 1 ? `${deps.siteUrl}/productos/${cart.lines[0]!.product.slug}` : `${deps.siteUrl}/#tienda`,
    });
  };
}
