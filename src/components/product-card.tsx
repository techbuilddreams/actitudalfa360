import Link from 'next/link';
import { formatMoney } from '@/domain/money';
import { defaultVariant, type Product } from '@/domain/product';
import { ProductPlate } from './product-gallery';

export function Assurances() {
  return (
    <ul className="assure">
      <li>Pago seguro con Stripe · Apple Pay · Google Pay</li>
      <li>¿Llegó dañado? Reemplazo o reembolso en 30 días</li>
    </ul>
  );
}

/** Tarjeta editorial: imagen, nombre, precio. Toda la tarjeta enlaza a la ficha (enlace estirado). */
export function ProductCard({ product }: { product: Product }) {
  const v = defaultVariant(product);
  return (
    <article className="card">
      <ProductPlate images={product.images} tag={product.tag} />
      <div className="card-body">
        <h3><Link href={`/productos/${product.slug}`}>{product.name}</Link></h3>
        <span className="price">{formatMoney(v.price)}</span>
        {product.subtitle && <span className="sub">{product.subtitle}</span>}
        <span className="more" aria-hidden="true">Descubrir</span>
      </div>
    </article>
  );
}
