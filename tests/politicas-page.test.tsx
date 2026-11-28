// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Politicas from '@/app/politicas/page';
import { site } from '@/config/site';

afterEach(cleanup);

describe('/politicas: privacidad de la lista del reto', () => {
  it('tiene su subsección dentro de Privacidad, con qué, para qué, encargado, baja y no venta', () => {
    render(<Politicas />);
    const h = screen.getByRole('heading', { level: 3, name: /lista del reto/i });
    expect(h.id).toBe('privacidad-reto');
    const text = h.parentElement!.querySelector('#privacidad-reto + ul')!.textContent!;
    for (const re of [/correo/, /zona horaria/, /membresía/, /cuatro casillas/, /un clic/, /no se venden ni se comparten/])
      expect(text).toMatch(re);
  });

  it('nombra a cada encargado, no solo al de correo', () => {
    render(<Politicas />);
    const text = document.querySelector('#privacidad-reto + ul')!.textContent!;
    for (const p of ['Resend', 'Supabase', 'Vercel']) expect(text).toContain(p);
  });

  it('promete que las casillas no van a anuncios ni a medición (línea roja de salud)', () => {
    render(<Politicas />);
    const text = document.querySelector('#privacidad-reto + ul')!.textContent!;
    expect(text).toMatch(/no se usan para anuncios, no se envían a herramientas de medición/);
  });

  it('dice cuánto se guarda, a quién escribir, en qué plazo, que la promesa no se guarda y que es para mayores', () => {
    render(<Politicas />);
    const text = document.querySelector('#privacidad-reto + ul')!.textContent!;
    expect(text).toContain(`borramos tus casillas en ${site.privacy.deleteAfterUnsubscribeDays} días`);
    expect(text).toMatch(/lista de bajas/);
    expect(text).toContain(site.email);
    expect(text).toContain(`Respondemos en ${site.privacy.responseDays} días`);
    expect(text).toMatch(/promesa.*no la guardamos/);
    expect(text).toMatch(/mayores de 18/);
    expect(text).not.toMatch(/esté activo/);
    expect(text).not.toMatch(/\{\w+\}/);
  });
});

describe('/politicas: términos', () => {
  it('sitúa la LLC en su estado real, no en Nueva York', () => {
    render(<Politicas />);
    const terms = screen.getByRole('heading', { level: 2, name: /términos/i }).nextElementSibling!.textContent!;
    expect(terms).toContain(`${site.legalName} (${site.legalState}, EE. UU.)`);
    expect(terms).not.toMatch(/Nueva York/);
  });
});

describe('/politicas: qué medimos y por qué', () => {
  const list = () => document.querySelector('#medicion + ul')!.textContent!;
  it('subsección #medicion dentro de Privacidad', () => {
    render(<Politicas />);
    expect(screen.getByRole('heading', { level: 3, name: /medimos/i }).id).toBe('medicion');
  });
  it('dice herramienta, qué se mide, qué NO, para qué, cuánto se guarda y cómo decir no', () => {
    render(<Politicas />);
    const text = list();
    for (const re of [/Google Analytics 4/, /productos? que ves/, /empiezas a pagar/, /te apuntas al reto/, /14 meses/, /Global Privacy Control/, /Preferencias de cookies/])
      expect(text).toMatch(re);
  });
  it('la línea roja por escrito: ni casillas, ni salud, ni correo a la medición; sin anuncios', () => {
    render(<Politicas />);
    const text = list();
    expect(text).toMatch(/no enviamos tu correo/);
    expect(text).toMatch(/casillas del reto/);
    expect(text).toMatch(/no usamos anuncios/i);
    expect(text).toMatch(/Google Signals/);
  });
});
