// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { RetoContent } from '@/components/reto-content';

afterEach(cleanup);

describe('/reto-30-dias', () => {
  it('publica las reglas como tabla: 4 pilares × Base y Estándar, con ancla por pilar', () => {
    render(<RetoContent />);
    const table = screen.getByRole('table', { name: 'Reglas del reto por pilar y nivel' });
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Pilar', 'Base', 'Estándar']);
    const rows = within(table).getAllByRole('rowheader');
    expect(rows.map((r) => r.querySelector('.pn')!.textContent)).toEqual(['Cuerpo', 'Mente', 'Dinero', 'Carácter']);
    expect(rows.map((r) => r.closest('tr')!.id)).toEqual(['regla-cuerpo', 'regla-mente', 'regla-dinero', 'regla-caracter']);
    expect(table.textContent).toContain('20 minutos');
  });

  it('cada formulario lleva su aviso de salud al lado', () => {
    const { container } = render(<RetoContent />);
    const forms = container.querySelectorAll('form');
    expect(forms).toHaveLength(2);
    forms.forEach((f) => expect(within(f as HTMLElement).getByText(/no sustituye el consejo médico/i)).toBeTruthy());
  });

  it('la membresía no se vende: sin botón de pago; «Avísame» lleva al formulario del reto', () => {
    render(<RetoContent />);
    expect(screen.getByRole('link', { name: 'Avísame cuando abra' }).getAttribute('href')).toBe('#empieza-membresia');
    const target = document.getElementById('empieza-membresia')!;
    expect(target.closest('#empieza')!.querySelector('form input[type=checkbox]')).toBeTruthy();
    const SELL = /pagar|suscrib|checkout|skool|unirme/i;
    expect(screen.queryByRole('button', { name: SELL })).toBeNull();
    expect(screen.queryByRole('link', { name: SELL })).toBeNull();
    for (const a of document.querySelectorAll('a[href]')) expect(a.getAttribute('href')).not.toMatch(/checkout|stripe|skool/i);
  });
});
