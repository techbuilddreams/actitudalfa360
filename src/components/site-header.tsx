'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/config/site';
import { MobileMenu } from './mobile-menu';

const RETO = '/reto-30-dias';

/** Menú de 4 (decisión 14). Sin Guías hasta que existan. Pilares y Membresía son secciones de la home. */
const LINKS = [
  { href: RETO, label: 'Reto', mobile: 'Reto de 30 días' },
  { href: '/#pilares', label: 'Pilares', mobile: 'Pilares' },
  { href: '/#tienda', label: 'Tienda', mobile: 'Tienda' },
  { href: '/#membresia', label: 'Membresía', mobile: 'Membresía' },
] as const;

export function SiteHeader() {
  const path = usePathname();
  const current = (href: string) => (href === RETO && path === RETO) || (href === '/#tienda' && path.startsWith('/productos/'));
  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/sello-68.webp" width={28} height={28} alt="" />
          <span className="brand-name">{site.name}</span>
        </Link>
        <nav className="nav" aria-label="Principal">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={current(l.href) ? 'page' : undefined}>{l.label}</Link>
          ))}
        </nav>
        <div className="top-actions">
          {path !== RETO && <Link className="btn sm" href={RETO}>Reto gratis</Link>}
          <MobileMenu key={path} links={LINKS.map((l) => ({ href: l.href, label: l.mobile }))} />
        </div>
      </div>
    </header>
  );
}
