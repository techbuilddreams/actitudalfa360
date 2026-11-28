// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Assurances } from '@/components/product-card';
import { site } from '@/config/site';

afterEach(cleanup);

describe('Assurances', () => {
  it('promete lo mismo que la política: daño, defecto o error; reemplazo o reembolso; plazo de site.returns', () => {
    const { container } = render(<Assurances />);
    const t = container.textContent ?? '';
    expect(t).toMatch(/equivocad/);
    expect(t).toMatch(/reemplazo o reembolso/i);
    expect(t).toContain(`${site.returns.days} días`);
  });
});
