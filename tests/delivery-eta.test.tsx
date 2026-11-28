// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { DeliveryEta } from '@/components/delivery-eta';
import { site } from '@/config/site';

afterEach(cleanup);

// Viernes 27 de noviembre de 2026: +5 hábiles = vie. 4; +12 hábiles = mar. 15 de dic.
const now = () => new Date(2026, 10, 27, 15, 30);

describe('DeliveryEta', () => {
  it('en el cliente calcula el rango con el reloj inyectado', async () => {
    render(<DeliveryEta shipping={site.shipping} now={now} />);
    const line = await screen.findByText(/llega aprox\. entre/);
    expect(line.textContent).toBe('Pídela hoy y llega aprox. entre el vie. 4 y el mar. 15 de dic.');
  });

  it('en el servidor no pinta fechas (no conoce el día del visitante): línea neutra', () => {
    const html = renderToString(<DeliveryEta shipping={site.shipping} now={now} />);
    expect(html).not.toMatch(/vie\. 4|dic\./);
    expect(html).toContain('Llega en 5 a 12 días hábiles');
  });
});
