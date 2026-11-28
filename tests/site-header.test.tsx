// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

let path = '/';
vi.mock('next/navigation', () => ({ usePathname: () => path }));
const { SiteHeader } = await import('@/components/site-header');
const { copy } = await import('@/content');

afterEach(cleanup);

describe('SiteHeader', () => {
  it('el menú principal tiene exactamente 4 entradas: Reto, Pilares, Tienda, Membresía (sin Guías)', () => {
    path = '/';
    render(<SiteHeader labels={copy.nav} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['Reto', 'Pilares', 'Tienda', 'Membresía']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/reto-30-dias', '/#pilares', '/#tienda', '/#membresia']);
  });

  it('muestra «Reto gratis» fuera de /reto-30-dias', () => {
    path = '/productos/taza-negra-15oz';
    render(<SiteHeader labels={copy.nav} />);
    expect(screen.getByRole('link', { name: 'Reto gratis' }).getAttribute('href')).toBe('/reto-30-dias');
  });

  it('en /reto-30-dias oculta «Reto gratis» y marca Reto como página actual', () => {
    path = '/reto-30-dias';
    render(<SiteHeader labels={copy.nav} />);
    expect(screen.queryByRole('link', { name: 'Reto gratis' })).toBeNull();
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Reto' }).getAttribute('aria-current')).toBe('page');
  });

  it('el enlace de marca tiene un solo nombre accesible', () => {
    path = '/';
    render(<SiteHeader labels={copy.nav} />);
    expect(screen.getByRole('link', { name: 'Actitud Alfa 360' }).getAttribute('href')).toBe('/');
  });
});
