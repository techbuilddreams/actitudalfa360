export interface PostalAddress {
  readonly streetAddress: string;
  readonly addressLocality: string;
  readonly addressRegion: string;
  readonly postalCode: string;
  /** ISO 3166-1 alfa-2. */
  readonly addressCountry: string;
}

const COUNTRY_NAMES: Record<string, string> = { US: 'United States' };

/** «calle, ciudad, ST 12345, país»: la forma que se imprime en el pie (CAN-SPAM). */
export const formatPostalAddress = (a: PostalAddress): string =>
  `${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}, ${COUNTRY_NAMES[a.addressCountry] ?? a.addressCountry}`;
