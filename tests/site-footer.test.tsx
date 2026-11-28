// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SiteFooter } from '@/components/site-footer';

afterEach(cleanup);

describe('SiteFooter', () => {
  it('muestra la dirección postal física (CAN-SPAM) junto al nombre legal', () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelector('.legal')?.textContent).toContain('2125 Biscayne Blvd, Ste 204, Miami, FL 33137, United States');
  });
});
