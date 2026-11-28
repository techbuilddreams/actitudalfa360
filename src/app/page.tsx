import type { Metadata } from 'next';
import { copy } from '@/content';
import { HomeContent } from '@/components/home-content';
import { JsonLd } from '@/components/json-ld';
import { faqLd, graph, organizationLd, websiteLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: { absolute: copy.home.title },
  description: copy.home.description,
  alternates: { canonical: '/' },
};

/** La página: metadata y datos estructurados (necesitan la petición: nonce). El contenido, en HomeContent. */
export default function Home() {
  return (
    <>
      <JsonLd data={graph(organizationLd(), websiteLd(), faqLd(copy.home.faq))} />
      <HomeContent />
    </>
  );
}
