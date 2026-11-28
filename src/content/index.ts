import 'server-only';
import raw from './copy.json';
import { shippingFlatCents } from '@/config/env';
import { formatMoney, usd } from '@/domain/money';
import { fillCopy } from '@/lib/fill-copy';

/**
 * Copy del sitio con los datos de negocio rellenados desde la configuración.
 * Importa SIEMPRE desde aquí, nunca `copy.json` directo: así el envío del texto
 * no puede separarse del que cobra Stripe (SHIPPING_FLAT_CENTS).
 */
export const copy = fillCopy(raw, { envio: formatMoney(usd(shippingFlatCents())) });
