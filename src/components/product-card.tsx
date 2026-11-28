import Link from 'next/link';
import { site } from '@/config/site';
import { formatMoney, type Money } from '@/domain/money';
import { defaultVariant, displayName, type Product } from '@/domain/product';
import { staged } from './product-gallery';

export function Assurances() {
  return (
    <ul className="assure">
      <li>¿Llegó dañado, defectuoso o equivocado? Reemplazo o reembolso en {site.returns.days} días</li>
    </ul>
  );
}

const CARD_SIZES = '(min-width: 760px) 30vw, calc(100vw - 32px)';

function CardImage({ src, alt }: { src: string; alt: string }) {
  const s = staged(src);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={s.src} srcSet={s.srcSet} sizes={CARD_SIZES} alt={alt} width={800} height={800} loading="lazy" decoding="async" />;
}

/** Tarjeta de tienda: toda la tarjeta enlaza a la ficha. Precio del catálogo. */
export function ProductCard({ product }: { product: Product }) {
  const img = product.images.find((i) => /frase|tumbler/.test(i.src)) ?? product.images[0];
  return (
    <Link className="card" href={`/productos/${product.slug}`}>
      <div className="stage"><CardImage src={img.src} alt={img.alt} /></div>
      <span className="card-meta"><span className="card-name">{displayName(product)}</span><span className="price num">{formatMoney(defaultVariant(product).price)}</span></span>
      {product.subtitle && <span className="card-line">{product.subtitle}</span>}
    </Link>
  );
}

/** Kit: lleva al bloque del kit en la ficha de la primera pieza. Suma real, sin descuento inventado. */
export function KitCard({ first, second, name, line, total }: { first: Product; second: Product; name: string; line: string; total: Money }) {
  return (
    <Link className="card" href={`/productos/${first.slug}#kit`}>
      <div className="stage kit-stage"><CardImage src={first.images[0].src} alt="" /><CardImage src={second.images[0].src} alt="" /></div>
      <span className="card-meta"><span className="card-name">{name}</span><span className="price num">{formatMoney(total)}</span></span>
      <span className="card-line">{line}</span>
    </Link>
  );
}
