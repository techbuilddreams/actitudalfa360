// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Politicas from '@/app/politicas/page';

afterEach(cleanup);

describe('/politicas: privacidad de la lista del reto', () => {
  it('tiene su subsección dentro de Privacidad, con qué, para qué, encargado, baja y no venta', () => {
    render(<Politicas />);
    const h = screen.getByRole('heading', { level: 3, name: /lista del reto/i });
    expect(h.id).toBe('privacidad-reto');
    const text = h.parentElement!.querySelector('#privacidad-reto + ul')!.textContent!;
    for (const re of [/correo/, /zona horaria/, /membresía/, /marcas? de cada día/, /correo diario/, /encargad/, /un clic/, /no vendemos ni compartimos/i])
      expect(text).toMatch(re);
  });
});
