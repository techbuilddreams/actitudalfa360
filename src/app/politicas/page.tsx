import type { Metadata } from 'next';
import { copy } from '@/content';
import { site } from '@/config/site';
import { publicEnv } from '@/config/env';
import { formatMoney } from '@/domain/money';
import { policyPhrases } from '@/lib/policy-facts';

export const metadata: Metadata = {
  title: { absolute: copy.politicas.title },
  description: copy.politicas.description,
  alternates: { canonical: '/politicas' },
};

export default function Politicas() {
  const shipCents = publicEnv().SHIPPING_FLAT_CENTS;
  const ship = formatMoney({ cents: shipCents, currency: 'usd' });
  const f = policyPhrases();
  return (
    <article className="doc">
      <span className="mono">Actualizado: noviembre 2026</span>
      <h1>Políticas</h1>

      <h2 id="envios">Envíos</h2>
      <p>Cada producto se imprime a pedido en EE. UU. La producción toma <strong>{f.handling}</strong> y la entrega <strong>{f.transit}</strong> más. {shipCents === 0 ? <>El envío es <strong>gratis</strong>.</> : <>El envío cuesta <strong>{ship}</strong> por pedido y se muestra antes de pagar.</>} Por ahora enviamos {f.onlyUs}. Cuando tu pedido salga, recibirás el número de rastreo por correo.</p>

      <h2 id="devoluciones">Devoluciones y cambios</h2>
      <p>Como cada pieza se hace especialmente para ti, {f.noReturns}. Si tu producto llega <strong>{f.defectKinds}</strong>, escríbenos <strong>{f.defectWindow}</strong> con una foto y tu número de pedido, y te enviamos un reemplazo o te devolvemos el dinero sin costo para ti.</p>

      <h2 id="privacidad">Privacidad</h2>
      <p>Solo pedimos los datos necesarios para procesar y enviar tu pedido: nombre, correo y dirección de envío. Los pagos los procesa <strong>Stripe</strong>; nunca vemos ni guardamos los datos de tu tarjeta. Compartimos tu nombre y dirección únicamente con nuestro socio de impresión y la compañía de envío para entregar tu pedido. No vendemos tus datos. Para pedir que borremos tu información, escríbenos.</p>

      {/* Aprobado por Luis el 2026-11-28. Cada frase es un requisito de F3 con su test. Texto en copy.json → politicas.retoPrivacy. */}
      <h3 id="privacidad-reto">{copy.politicas.retoPrivacy.h3}</h3>
      <ul>{copy.politicas.retoPrivacy.items.map((i) => <li key={i}>{i}</li>)}</ul>

      {/* BORRADOR del CTO (2026-11-28), pendiente de Luis y del abogado. Texto en copy.json → politicas.medicion. */}
      <h3 id="medicion">{copy.politicas.medicion.h3}</h3>
      <ul>{copy.politicas.medicion.items.map((i) => <li key={i}>{i}</li>)}</ul>

      <h2 id="terminos">Términos</h2>
      <p>{site.name} es una marca de {site.legalName} ({site.legalState}, EE. UU.). Los precios están en dólares estadounidenses y pueden cambiar sin aviso; el precio que pagas es el que ves al confirmar. Los colores pueden variar ligeramente entre la pantalla y el producto impreso. El nombre, el sello y los diseños de {site.name} son propiedad de la marca.</p>

      <h2 id="contacto">Contacto</h2>
      <p><strong>{site.email}</strong></p>
    </article>
  );
}
