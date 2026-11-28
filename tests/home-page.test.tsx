// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HomeContent } from '@/components/home-content';

afterEach(cleanup);

// No vacuo: la home pintada tiene que tener enlaces antes de afirmar que ninguno vende.
const renderHome = () => {
  render(<HomeContent />);
  expect(document.querySelectorAll('a[href]').length).toBeGreaterThan(5);
};

describe('home', () => {
  it('no vende nada: ni enlace ni botón de pago, suscripción, checkout o Skool', () => {
    renderHome();
    const SELL = /pagar|suscrib|checkout|skool/i;
    expect(screen.queryByRole('link', { name: SELL })).toBeNull();
    expect(screen.queryByRole('button', { name: SELL })).toBeNull();
    for (const a of document.querySelectorAll('a[href]')) expect(a.getAttribute('href')).not.toMatch(/checkout|stripe|skool/i);
  });

  it('«Avísame cuando abra» apunta a #empieza-membresia, que existe junto al formulario con la casilla', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'Avísame cuando abra' }).getAttribute('href')).toBe('#empieza-membresia');
    const target = document.getElementById('empieza-membresia');
    expect(target).toBeTruthy();
    expect(target!.closest('section')!.querySelector('form input[type=checkbox]')).toBeTruthy();
  });

  it('la membresía se anuncia en dólares enteros: «$12», no «$12.00»', () => {
    renderHome();
    const price = document.querySelector('#membresia .price')!.textContent!;
    expect(price).toMatch(/^\$12\b/);
    expect(price).not.toContain('12.00');
  });

  it('el sello del hero (88 px en móvil) ofrece la variante de 68 en el srcset', () => {
    renderHome();
    const seal = document.querySelector('img.hero-seal')!;
    expect(seal.getAttribute('src')).toBe('/img/sello-68.webp');
    expect(seal.getAttribute('srcset')).toContain('/img/sello-68.webp 68w');
  });

  it('sin sección del fundador (decisión C: fuera hasta que Luis mande foto y texto)', () => {
    renderHome();
    expect(screen.queryByRole('heading', { name: /fundador|quién está detrás/i })).toBeNull();
    expect(document.querySelector('#fundador')).toBeNull();
  });
});
