'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/config/site';
import { MobileMenu } from './mobile-menu';

const RETO = '/reto-30-dias';

/** Textos de la cabecera (copy.json → `nav`). El copy es de servidor: el layout los pasa por props. */
export interface HeaderLabels {
  aria: string; reto: string; retoLong: string; pilares: string; tienda: string; membresia: string;
  cta: string; menuOpen: string; menuClose: string; menuAria: string;
}

/** Menú de 4 (decisión 14). Sin Guías hasta que existan. Pilares y Membresía son secciones de la home. */
export function SiteHeader({ labels: l }: { labels: HeaderLabels }) {
  const path = usePathname();
  const links = [
    { href: RETO, label: l.reto, mobile: l.retoLong },
    { href: '/#pilares', label: l.pilares, mobile: l.pilares },
    { href: '/#tienda', label: l.tienda, mobile: l.tienda },
    { href: '/#membresia', label: l.membresia, mobile: l.membresia },
  ];
  const current = (href: string) => (href === RETO && path === RETO) || (href === '/#tienda' && path.startsWith('/productos/'));
  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/sello-68.webp" width={28} height={28} alt="" />
          <span className="brand-name">{site.name}</span>
        </Link>
        <nav className="nav" aria-label={l.aria}>
          {links.map((x) => (
            <Link key={x.href} href={x.href} aria-current={current(x.href) ? 'page' : undefined}>{x.label}</Link>
          ))}
        </nav>
        <div className="top-actions">
          {path !== RETO && <Link className="btn sm" href={RETO}>{l.cta}</Link>}
          <MobileMenu key={path} links={links.map((x) => ({ href: x.href, label: x.mobile }))}
            labels={{ open: l.menuOpen, close: l.menuClose, aria: l.menuAria }} />
        </div>
      </div>
    </header>
  );
}
