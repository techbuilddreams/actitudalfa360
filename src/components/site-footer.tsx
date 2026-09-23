import Link from 'next/link';
import { site } from '@/config/site';
import { catalog } from '@/infrastructure/container';

export function SiteFooter() {
  const products = catalog.all();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="signoff">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/sello-320.webp" width={72} height={72} alt="" loading="lazy" decoding="async" />
          <p>Háblame de hacer dinero, <em>no de gente.</em></p>
        </div>

        <div className="fcols">
          <div className="fbrand">
            <Link className="brand" href="/"><span>{site.name}</span></Link>
            <p>Mentalidad 360° para los que están construyendo algo. Cuerpo, mente, dinero y carácter.</p>
          </div>
          <nav aria-label="Tienda">
            <p className="fhead">Tienda</p>
            <ul>
              {products.map((p) => <li key={p.slug}><Link href={`/productos/${p.slug}`}>{p.name}</Link></li>)}
              <li><Link href="/#tienda">Toda la colección</Link></li>
            </ul>
          </nav>
          <nav aria-label="Marca">
            <p className="fhead">Marca</p>
            <ul>
              <li><Link href="/#pilares">Los 4 pilares</Link></li>
              <li><Link href="/#manifiesto">Manifiesto</Link></li>
              <li><Link href="/#preguntas">Preguntas</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <p className="fhead">Ayuda y legal</p>
            <ul>
              <li><Link href="/politicas#envios">Envíos y devoluciones</Link></li>
              <li><Link href="/politicas#privacidad">Privacidad</Link></li>
              <li><Link href="/politicas#terminos">Términos</Link></li>
              <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
            </ul>
          </nav>
        </div>

        <div className="fbase">
          <p>© {new Date().getFullYear()} {site.name} · {site.legalName}</p>
          <p>Hecho a pedido · Envíos en EE. UU.</p>
        </div>
      </div>
    </footer>
  );
}
