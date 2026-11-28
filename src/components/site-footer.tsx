import Link from 'next/link';
import { copy } from '@/content';
import { site } from '@/config/site';
import { displayName } from '@/domain/product';
import { catalog } from '@/infrastructure/container';

/** Pie. Solo enlaza lo que existe: sin Guías ni páginas de pilar (van a sus reglas del reto). */
export function SiteFooter() {
  const products = catalog.all();
  const t = copy.footer;
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link className="brand" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/sello-68.webp" alt="" width={28} height={28} loading="lazy" decoding="async" />
              {site.name}
            </Link>
            <p>{site.slogan}</p>
          </div>
          <nav aria-labelledby="f-reto">
            <h2 className="foot-h" id="f-reto">{t.reto}</h2>
            <ul>
              <li><Link href="/reto-30-dias">{t.retoLink}</Link></li>
              <li><Link href="/#membresia">{t.membresia}</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="f-pilares">
            <h2 className="foot-h" id="f-pilares">{t.pilares}</h2>
            <ul>{copy.pillars.map((p) => <li key={p.id}><Link href={`/reto-30-dias#regla-${p.id}`}>{p.name}</Link></li>)}</ul>
          </nav>
          <nav aria-labelledby="f-tienda">
            <h2 className="foot-h" id="f-tienda">{t.tienda}</h2>
            <ul>
              {products.map((p) => <li key={p.slug}><Link href={`/productos/${p.slug}`}>{displayName(p)}</Link></li>)}
              <li><Link href="/politicas#envios">{t.envios}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} {site.legalName}</span>
          {site.postalAddress && <span>{site.postalAddress}</span>}
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <Link href="/politicas#privacidad">{t.privacidad}</Link>
          <Link href="/politicas#terminos">{t.terminos}</Link>
        </div>
      </div>
    </footer>
  );
}
