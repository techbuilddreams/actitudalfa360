import Link from 'next/link';
import { copy } from '@/content';
import { site } from '@/config/site';
import { addMoney, formatMoney, usd } from '@/domain/money';
import { defaultVariant, displayName, type Product } from '@/domain/product';
import { shippingNote } from '@/lib/price-notes';
import { BuyBox } from './buy-box';
import { DeliveryEta } from './delivery-eta';
import { Faq } from './faq';
import { KitButton } from './kit-button';
import { CheckoutProvider } from './use-checkout';
import { Assurances } from './product-card';
import { ProductGallery, thumb } from './product-gallery';

interface Props {
  product: Product;
  /** La otra pieza del kit (si existe). */
  partner?: Product;
  shippingCents: number;
  automaticTax: boolean;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Ficha. Orden pensado para 390×664: migas, foto 4:3, nombre + precio, cantidad + comprar
 * (todo en la primera pantalla); después el texto de venta, la entrega y el kit.
 */
export function ProductView({ product, partner, shippingCents, automaticTax }: Props) {
  const t = copy.pdp;
  const v = defaultVariant(product);
  const shipping = usd(shippingCents);
  const name = displayName(product);
  const quote = product.h1.slice(name.length).replace(/^\s+—\s+/, '');
  const pillar = copy.pillars.find((p) => p.id === product.pillar);
  const pv = partner ? defaultVariant(partner) : undefined;

  return (
    <>
      <div className="wrap">
        <nav className="crumbs" aria-label="Migas de pan">
          <ol>
            <li><Link href="/">{t.crumbHome}</Link></li>
            <li><Link href="/#tienda">{t.crumbShop}</Link></li>
            <li aria-current="page">{name}</li>
          </ol>
        </nav>
        <div className="pdp">
          <ProductGallery images={product.images} />
          <CheckoutProvider messages={copy.checkout}>
          <div className="buy">
            <div className="pdp-title">
              <h1>{name}{quote && <><span className="sr-only"> — </span><span className="frase">{quote}</span></>}</h1>
              <span className="price num">{formatMoney(v.price)}</span>
            </div>
            <BuyBox sku={v.sku} label={t.buy} barLabel={t.barBuy} name={name} price={formatMoney(v.price)}
              thumb={thumb(product.images[0].src)} qtyLabels={t.qty} />
            <p className="lede">{product.shortPitch}</p>
            <p className="paywith">{t.paywith}</p>
            <div className="arrive">
              <DeliveryEta shipping={site.shipping} />
              <span>{capitalize(shippingNote(shipping, automaticTax))} · {t.printed}</span>
            </div>
            {partner && pv && (
              <div className="kit" id="kit">
                <div className="stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(partner.images[0].src)} alt="" width={800} height={800} sizes="96px" loading="lazy" decoding="async" />
                </div>
                <div>
                  <p>{t.kitTitle}<Link href={`/productos/${partner.slug}`}>{displayName(partner)}</Link></p>
                  <p className="kit-price">{t.kitPricePre}{formatMoney(addMoney(v.price, pv.price))}{t.kitPriceMid}{formatMoney(shipping)}</p>
                </div>
                <KitButton currentSku={v.sku} otherSku={pv.sku} label={t.kitButton} />
              </div>
            )}
            <ul className="bullets">
              {product.specs.map((s) => <li key={s.label}><b>{s.label}</b><span>{s.value}</span></li>)}
            </ul>
            <Assurances />
          </div>
          </CheckoutProvider>
        </div>
      </div>

      <section className="sec" aria-labelledby="h-uso">
        <div className="wrap">
          <div className="sec-head"><p className="eyebrow">{t.inUse.eyebrow}</p><h2 id="h-uso">{t.inUse.h2}</h2></div>
          <div className="inuse">
            <p className="lede">{product.longDescription}</p>
            {pillar && (
              <p className="callout">
                {t.pillarPre}<Link className="link" href={`/reto-30-dias#regla-${pillar.id}`}>{pillar.name}</Link>{t.pillarPost}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-faq-pdp">
        <div className="wrap">
          <div className="sec-head"><p className="eyebrow">{t.faqHead.eyebrow}</p><h2 id="h-faq-pdp">{t.faqHead.h2}</h2></div>
          <Faq items={product.faq} />
        </div>
      </section>
    </>
  );
}
