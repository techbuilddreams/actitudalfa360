import 'server-only';
import raw from './copy.json';
import { publicEnv } from '@/config/env';
import { site } from '@/config/site';
import { formatMoney, formatMoneyShort, usd } from '@/domain/money';
import { fillCopy } from '@/lib/fill-copy';
import { PRICES } from '@/infrastructure/catalog/prices';

const pub = publicEnv();
const envio = formatMoney(usd(pub.SHIPPING_FLAT_CENTS));
// Con envío 0, el texto dice «envío gratis», nunca «$0.00» (las dos frases viven en copy.json → envioFrase).
// Las dos frases no se exportan: la que no aplica no debe poder pintarse.
const { envioFrase: frases, ...texts } = raw;
const envioFrase = fillCopy(pub.SHIPPING_FLAT_CENTS === 0 ? frases.gratis : frases.fijo, { envio });

/**
 * Copy del sitio con los datos de negocio rellenados desde su única fuente.
 * Importa SIEMPRE desde aquí, nunca `copy.json` directo (lo impide eslint): así el texto
 * no puede separarse de lo que cobra Stripe. Lee solo variables públicas: un secreto
 * de pago mal puesto no tumba páginas que no cobran.
 */
export const copy = fillCopy(texts, {
  envio,
  envioFrase,
  envioTitulo: envioFrase.charAt(0).toUpperCase() + envioFrase.slice(1),
  precioTaza: formatMoney(PRICES.taza),
  precioVaso: formatMoney(PRICES.vaso),
  diasDevolucion: String(site.returns.days),
  diasReto: String(site.challenge.days),
  correo: site.email,
  estadoLegal: site.legalState,
  diasBorrado: String(site.privacy.deleteAfterUnsubscribeDays),
  diasRespuesta: String(site.privacy.responseDays),
  precioMembresia: formatMoneyShort(usd(site.membership.priceCents)),
  // Puntuación máxima: un punto por pilar cada día. El día del ejemplo es relativo al total (12 de 30).
  puntosMax: String(site.challenge.days * raw.pillars.length),
  diaEjemplo: String(Math.round((site.challenge.days * 2) / 5)),
  diasProduccion: `${site.shipping.handlingDays.min} a ${site.shipping.handlingDays.max}`,
  diasEnvio: `${site.shipping.transitDays.min} a ${site.shipping.transitDays.max}`,
  diasTotal: `${site.shipping.handlingDays.min + site.shipping.transitDays.min} a ${site.shipping.handlingDays.max + site.shipping.transitDays.max}`,
  impuesto: pub.STRIPE_AUTOMATIC_TAX ? ' El impuesto de tu estado se suma al pagar.' : '',
});
