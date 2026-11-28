// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailCapture } from '@/components/email-capture';
import { copy } from '@/content';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const t = copy.capture;
const ok = () => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 202 }));
const type = (v: string) => fireEvent.change(screen.getByLabelText(t.label), { target: { value: v } });
const send = () => fireEvent.click(screen.getByRole('button', { name: t.button }));

describe('EmailCapture', () => {
  it('tiene etiqueta, un solo campo, baja con un clic y enlace a privacidad', () => {
    render(<EmailCapture source="home" text={t} submit={ok} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByText(/Te das de baja con un clic/)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.privacy }).getAttribute('href')).toBe('/politicas#privacidad');
  });

  it('vacío o inválido: error con role=alert, aria-invalid y NO envía', async () => {
    const submit = vi.fn(ok);
    render(<EmailCapture source="home" text={t} submit={submit} />);
    send();
    expect((await screen.findByRole('alert')).textContent).toBe(t.errEmpty);
    type('juan@correo');
    send();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.errInvalid));
    expect(screen.getByLabelText(t.label).getAttribute('aria-invalid')).toBe('true');
    expect(submit).not.toHaveBeenCalled();
  });

  it('envía { email normalizado, timeZone del resolutor inyectado, source, membershipInterest } y con 202 muestra el éxito', async () => {
    const submit = vi.fn(ok);
    // Zona inyectada (ni UTC ni la de la máquina): un «UTC» escrito a mano no puede pasar.
    render(<EmailCapture source="reto" text={t} submit={submit} resolveTimeZone={() => 'Pacific/Chatham'} />);
    type('  Juan@Correo.COM ');
    send();
    expect(await screen.findByText(t.okTitle)).toBeTruthy();
    expect(submit).toHaveBeenCalledWith({ email: 'juan@correo.com', timeZone: 'Pacific/Chatham', source: 'reto', membershipInterest: false });
    expect(screen.getByText(/juan@correo\.com/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('casilla opcional de la membresía, sin marcar por defecto; marcada viaja como membershipInterest: true', async () => {
    const submit = vi.fn(ok);
    render(<EmailCapture source="home" text={t} submit={submit} resolveTimeZone={() => 'UTC'} />);
    const box = screen.getByRole('checkbox', { name: t.membership }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    type('juan@correo.com');
    send();
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ membershipInterest: true }));
  });

  it('llegar por «Avísame cuando abra» (#empieza-membresia) deja la casilla marcada', async () => {
    window.location.hash = '';
    render(<EmailCapture source="home" text={t} submit={ok} membershipHash="empieza-membresia" />);
    const box = screen.getByRole('checkbox', { name: t.membership }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    window.location.hash = '#empieza-membresia';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => expect(box.checked).toBe(true));
    window.location.hash = '';
  });

  it('dice la frecuencia junto al formulario', () => {
    render(<EmailCapture source="home" text={t} submit={ok} />);
    expect(screen.getByText(t.daily)).toBeTruthy();
  });

  it('400 {error}: muestra el error del servidor y deja el campo', async () => {
    render(<EmailCapture source="home" text={t} submit={() => Promise.resolve(new Response(JSON.stringify({ error: 'Correo no válido.' }), { status: 400 }))} />);
    type('juan@correo.com');
    send();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Correo no válido.'));
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it.each([
    ['red caída', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['429', () => Promise.resolve(new Response(JSON.stringify({ error: 'x' }), { status: 429, headers: { 'Retry-After': '60' } }))],
    ['502', () => Promise.resolve(new Response('', { status: 502 }))],
  ])('%s: error reintentable en español y el botón vuelve a funcionar', async (_n, submit) => {
    render(<EmailCapture source="home" text={t} submit={submit} />);
    type('juan@correo.com');
    send();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.errRetry));
    expect((screen.getByRole('button', { name: t.button }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('sin submit inyectado: POST JSON a /api/reto/signup', async () => {
    const fetchMock = vi.fn(ok);
    vi.stubGlobal('fetch', fetchMock);
    render(<EmailCapture source="home" text={t} />);
    type('juan@correo.com');
    send();
    await screen.findByText(t.okTitle);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/reto/signup');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toMatchObject({ email: 'juan@correo.com', source: 'home' });
  });
});
