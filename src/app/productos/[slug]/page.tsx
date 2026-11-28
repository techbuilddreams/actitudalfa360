import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicEnv } from '@/config/env';
import { catalog } from '@/infrastructure/container';
import { JsonLd } from '@/components/json-ld';
import { ProductView } from '@/components/product-view';
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
  const pub = publicEnv();
  // Kit de dos piezas: la otra pieza del catálogo (hoy hay dos).
  const partner = catalog.all().find((p) => p.slug !== product.slug);
  const trail = [{ name: 'Inicio', path: '/' }, { name: 'Tienda', path: '/#tienda' }, { name: product.name, path: `/productos/${product.slug}` }];

  return (
    <>
      <JsonLd data={graph(productLd(product, pub.SHIPPING_FLAT_CENTS, new Date()), breadcrumbLd(trail), faqLd(product.faq))} />
      <ProductView product={product} partner={partner} shippingCents={pub.SHIPPING_FLAT_CENTS} automaticTax={pub.STRIPE_AUTOMATIC_TAX} />
    </>
  );
}
