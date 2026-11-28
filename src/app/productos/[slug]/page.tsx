import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deliveryPromise } from '@/config/site';
import { publicEnv } from '@/config/env';
import { formatMoney, usd } from '@/domain/money';
import { shippingNote } from '@/lib/price-notes';
import { defaultVariant } from '@/domain/product';
import { catalog } from '@/infrastructure/container';
import { BuyBox } from '@/components/buy-box';
import { Faq } from '@/components/faq';
import { JsonLd } from '@/components/json-ld';
import { Assurances, ProductCard } from '@/components/product-card';
import { ProductGallery } from '@/components/product-gallery';
import { breadcrumbLd, faqLd, graph, productLd } from '@/lib/structured-data';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return catalog.all().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = catalog.bySlug((await params).slug);
  if (!p) return {};
  const img = p.images[0];
  return {
    title: { absolute: p.seo.title },
    description: p.seo.description,
    keywords: [...p.seo.keywords],
    alternates: { canonical: `/productos/${p.slug}` },
    openGraph: { type: 'website', title: p.seo.title, description: p.seo.description, url: `/productos/${p.slug}`, images: [{ url: img.jpg, width: img.width, height: img.height, alt: img.alt }] },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = catalog.bySlug((await params).slug);
  if (!product) notFound();
  const v = defaultVariant(product);
  const others = catalog.all().filter((p) => p.slug !== product.slug);
  // El h1 lleva nombre + frase ("Taza negra 15 oz — Háblame…"): se separan solo para el diseño.
  const [name, quote] = product.h1.split(/\s+—\s+/, 2);
  const trail = [{ name: 'Inicio', path: '/' }, { name: 'Tienda', path: '/#tienda' }, { name: product.name, path: `/productos/${product.slug}` }];

  return (
    <>
      <JsonLd data={graph(productLd(product, publicEnv().SHIPPING_FLAT_CENTS), breadcrumbLd(trail), faqLd(product.faq))} />
      <nav aria-label="Migas de pan">
        <ol className="crumbs">
          <li><Link href="/">Inicio</Link></li>
          <li><Link href="/#tienda">Tienda</Link></li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="pdp">
        <ProductGallery images={product.images} tag={product.tag} />
        <div className="pdp-info">
          <p className="eyebrow">{product.category}</p>
          <h1>
            <span className="pdp-name">{name}</span>
            {quote && <><span className="sr-only"> — </span><span className="pdp-quote">{quote}</span></>}
          </h1>
          <p className="pdp-price">{formatMoney(v.price)}</p>
          <p className="pitch">{product.shortPitch}</p>
          <div className="buybox">
            <BuyBox sku={v.sku} label="Comprar ahora" />
            <p className="ship">{deliveryPromise} · {shippingNote(usd(publicEnv().SHIPPING_FLAT_CENTS), publicEnv().STRIPE_AUTOMATIC_TAX)}</p>
            <Assurances />
          </div>
          <ol className="bullets">{product.bullets.map((b) => <li key={b}>{b}</li>)}</ol>
        </div>
      </div>

      <section className="story" aria-labelledby="story-h">
        <div>
          <p className="eyebrow">La pieza</p>
          <h2 id="story-h">En detalle</h2>
        </div>
        <div>
          <p className="long">{product.longDescription}</p>
          <dl className="specs">
            {product.specs.map((s) => (<Fragment key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></Fragment>))}
          </dl>
        </div>
      </section>

      <section className="split" aria-labelledby="faq-h">
        <div className="head"><div><p className="eyebrow">Preguntas</p><h2 id="faq-h">Sobre este producto</h2></div></div>
        <Faq items={product.faq} />
      </section>

      {others.length > 0 && (
        <section className="related" aria-labelledby="rel-h">
          <div className="head"><div><p className="eyebrow">También te puede servir</p><h2 id="rel-h">Completa el equipo</h2></div></div>
          <div className="products">{others.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
        </section>
      )}
    </>
  );
}
