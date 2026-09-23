import Link from 'next/link';
import { site } from '@/config/site';
import { MobileMenu } from './mobile-menu';

const LINKS = [
  { href: '/#pilares', label: 'Pilares' },
  { href: '/#tienda', label: 'Colección' },
  { href: '/#manifiesto', label: 'Manifiesto' },
  { href: '/#preguntas', label: 'Preguntas' },
] as const;

export function SiteHeader() {
  return (
    <nav aria-label="Principal" className="topnav">
      <div className="wrap">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/sello-68.webp" width={34} height={34} alt="" />
          <span>{site.name}</span>
        </Link>
        <div className="navlinks">
          {LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          <Link className="btn ghost sm" href="/#tienda">Tienda</Link>
        </div>
        <MobileMenu links={LINKS} />
      </div>
    </nav>
  );
}
