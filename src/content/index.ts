import 'server-only';
import raw from './copy.json';
import { publicEnv } from '@/config/env';
import { site } from '@/config/site';
import { formatMoney, usd } from '@/domain/money';
import { fillCopy } from '@/lib/fill-copy';
import { PRICES } from '@/infrastructure/catalog/prices';

const pub = publicEnv();

/**
 * Copy del sitio con los datos de negocio rellenados desde su única fuente.
 * Importa SIEMPRE desde aquí, nunca `copy.json` directo (lo impide eslint): así el texto
 * no puede separarse de lo que cobra Stripe. Lee solo variables públicas: un secreto
 * de pago mal puesto no tumba páginas que no cobran.
 */
export const copy = fillCopy(raw, {
  envio: formatMoney(usd(pub.SHIPPING_FLAT_CENTS)),
  precioTaza: formatMoney(PRICES.taza),
  precioVaso: formatMoney(PRICES.vaso),
  diasDevolucion: String(site.returns.days),
  impuesto: pub.STRIPE_AUTOMATIC_TAX ? ' El impuesto de tu estado se suma al pagar.' : '',
});
