import type { Metadata } from 'next';
import { copy } from '@/content';
import { JsonLd } from '@/components/json-ld';
import { RetoContent } from '@/components/reto-content';
import { breadcrumbLd, graph, webPageLd } from '@/lib/structured-data';

const PATH = '/reto-30-dias';

export const metadata: Metadata = {
  title: { absolute: copy.reto.title },
  description: copy.reto.description,
  alternates: { canonical: PATH },
  openGraph: { type: 'website', title: copy.reto.title, description: copy.reto.description, url: PATH },
};

export default function RetoPage() {
  const r = copy.reto;
  return (
    <>
      <JsonLd data={graph(webPageLd(PATH, r.h1, r.description), breadcrumbLd([{ name: 'Inicio', path: '/' }, { name: r.crumb, path: PATH }]))} />
      <RetoContent />
    </>
  );
}
