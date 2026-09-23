import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { env } from '@/config/env';
import { site } from '@/config/site';
import { formatMoney } from '@/domain/money';
import { orderConfirmation, pageLookupLimiter } from '@/infrastructure/container';
import { clientIp } from '@/infrastructure/security/request-guards';

export const metadata: Metadata = { title: 'Pedido confirmado', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ pedido?: string }> };

/** j•••@gmail.com — la URL puede compartirse o salir en una captura: no exponemos el correo completo. */
const maskEmail = (email: string) => {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 1)}•••@${domain}`;
};

async function load(ref: string | undefined) {
  if (!ref) return null;
  const ip = clientIp(await headers(), env().TRUSTED_PROXY_HOPS);
  if (!pageLookupLimiter.hit(ip).allowed) return null;
  try {
    return await orderConfirmation(ref);
  } catch {
    return null;
  }
}

export default async function Gracias({ searchParams }: Props) {
  const summary = await load((await searchParams).pedido);
  const pending = summary !== null && !summary.paid; // pagos diferidos (p. ej. transferencia) aún sin confirmar
  const { handlingDays: h, transitDays: t } = site.shipping;
  return (
    <section className="doc center center-page">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/sello-320.webp" width={160} height={160} alt="" />
      <span className="mono">{summary?.label ? `Pedido ${summary.label}` : pending ? 'Pago en proceso' : 'Pedido recibido'}</span>
      <h1>{pending ? 'Gracias. Estamos confirmando tu pago.' : 'Gracias. Tu pedido está confirmado.'}</h1>
      {summary?.email && (
        <p>
          {pending ? 'Te avisaremos a ' : 'Te enviamos la confirmación a '}
          <strong>{maskEmail(summary.email)}</strong>
          {summary.total ? ` por ${formatMoney(summary.total)}` : ''}.
        </p>
      )}
      <p>Se produce a pedido en EE. UU. en {h.min}–{h.max} días hábiles y se entrega en {t.min}–{t.max} días hábiles. Cuando salga te mandamos el número de rastreo.</p>
      <p>¿Alguna duda? Escríbenos a <strong>{site.email}</strong>{summary?.label ? ` con tu número de pedido ${summary.label}` : ''}.</p>
      <Link className="btn" href="/">Volver al inicio</Link>
    </section>
  );
}
