import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { connection } from 'next/server';
import { copy } from '@/content';
import { site } from '@/config/site';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import './globals.css';

const body = localFont({ src: './fonts/Archivo-wght.woff2', variable: '--font-body', weight: '100 900', display: 'swap', preload: true });
// Serifa editorial (solo latin): todos los titulares. Se usa en el H1 ⇒ precarga.
const serif = localFont({
  src: [
    { path: './fonts/CormorantGaramond-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/CormorantGaramond-MediumItalic.woff2', weight: '500', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: copy.home.title, template: `%s | ${site.name}` },
  description: copy.home.description,
  applicationName: site.name,
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: site.locale,
    images: [{ ...site.ogImage, alt: `${site.name} — ${site.slogan}` }],
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: [{ url: '/favicon.ico', sizes: '32x32' }, { url: '/img/icon-192.png', type: 'image/png', sizes: '192x192' }], apple: '/img/apple-touch-icon.png' },
  robots: site.isStaging ? { index: false, follow: false } : { index: true, follow: true, 'max-image-preview': 'large' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: site.themeColor, colorScheme: 'dark' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSP con nonce por petición ⇒ cada página se renderiza al pedirla (los scripts llevan el nonce).
  await connection();
  return (
    <html lang={site.lang} className={`${body.variable} ${serif.variable}`}>
      <body>
        {site.isStaging && <div className="preview-bar">Staging · no es la tienda real · pagos en modo prueba</div>}
        <a className="skip" href="#main">Ir al contenido</a>
        <SiteHeader labels={copy.nav} />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
