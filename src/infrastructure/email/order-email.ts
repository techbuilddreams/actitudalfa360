import { deliveryPromise, site } from '@/config/site';
import { formatMoney, usd } from '@/domain/money';
import { orderLabel, UNKNOWN_SKU, type Order } from '@/domain/order';
import type { EmailMessage } from '@/application/ports/mailer';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Líneas tal como se vendieron (snapshot del pedido): nunca dependen del catálogo actual. */
const lineItems = (order: Order) =>
  order.lines.map((l) => ({ name: l.name, quantity: l.quantity, total: l.unitCents ? formatMoney(usd(l.unitCents * l.quantity)) : '' }));

/** Filas de desglose: solo las que aplican. Pedidos antiguos sin desglose muestran solo el total. */
function breakdown(order: Order): [string, string][] {
  const a = order.amounts;
  if (a.subtotal.cents === 0) return [];
  const rows: [string, string][] = [['Subtotal', formatMoney(a.subtotal)]];
  if (a.discount.cents > 0) rows.push(['Descuento', `−${formatMoney(a.discount)}`]);
  rows.push(['Envío', formatMoney(a.shipping)]);
  if (a.tax.cents > 0) rows.push(['Impuestos', formatMoney(a.tax)]);
  return rows;
}

/** Lo que ve el CLIENTE: la línea centinela (líneas perdidas) es interna; él ve "en revisión". */
const customerItems = (order: Order) => {
  const known = lineItems({ ...order, lines: order.lines.filter((l) => l.sku !== UNKNOWN_SKU) });
  const lost = order.lines.some((l) => l.sku === UNKNOWN_SKU);
  return lost ? [...known, { name: 'Detalle del pedido en revisión', quantity: 0, total: '' }] : known;
};

/** Correo de confirmación al cliente (HTML con estilos en línea + texto plano). */
export function orderConfirmationEmail(order: Order): EmailMessage | null {
  if (!order.email) return null;
  const items = customerItems(order);
  const extra = breakdown(order);
  const ref = orderLabel(order);
  const name = order.shipping?.name?.split(' ')[0] ?? '';
  const a = order.shipping;
  const address: string[] = a ? [a.name, a.line1, a.line2 ?? "", `${a.city}, ${a.state} ${a.postalCode}`].filter((x) => x.length > 0) : [];

  const rows = items
    .map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #2A2926;color:#ECE8E0">${esc(i.name)}${i.quantity ? ` × ${i.quantity}` : ''}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #2A2926;color:#ECE8E0;font-family:Menlo,monospace">${i.total}</td></tr>`)
    .join('');

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#0E0E0D;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E0E0D;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:24px"><img src="${site.url}/img/icon-192.png" width="64" height="64" alt="${site.name}" style="display:block"></td></tr>
<tr><td style="color:#9C978C;font:12px Menlo,monospace;letter-spacing:2px;text-transform:uppercase">Pedido ${ref}</td></tr>
<tr><td style="color:#ECE8E0;font-size:30px;font-weight:bold;line-height:1.15;padding:10px 0 16px;text-transform:uppercase">Gracias${name ? `, ${esc(name)}` : ''}. Tu pedido está confirmado.</td></tr>
<tr><td style="color:#9C978C;font-size:15px;line-height:1.6;padding-bottom:24px">${esc(deliveryPromise)}. Cuando salga te enviaremos el número de rastreo.</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">${rows}
${extra.map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #2A2926;color:#9C978C">${k}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #2A2926;color:#9C978C;font-family:Menlo,monospace">${v}</td></tr>`).join('')}
<tr><td style="padding:14px 0;color:#ECE8E0;font-weight:bold">Total pagado</td><td align="right" style="padding:14px 0;color:#ECE8E0;font-weight:bold;font-family:Menlo,monospace">${formatMoney(order.total)}</td></tr></table></td></tr>
${address.length ? `<tr><td style="padding-top:20px;color:#9C978C;font-size:14px;line-height:1.6"><span style="color:#B89A5E;font:12px Menlo,monospace;letter-spacing:2px;text-transform:uppercase">Envío a</span><br>${address.map(esc).join('<br>')}</td></tr>` : ''}
<tr><td style="padding-top:28px;border-top:1px solid #2A2926;margin-top:28px;color:#9C978C;font-size:13px;line-height:1.6">¿Dudas? Responde a este correo o escríbenos a ${site.email}.<br>${site.name} · ${site.legalName} · <a href="${site.url}" style="color:#B89A5E">${site.url.replace('https://', '')}</a></td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Gracias${name ? `, ${name}` : ''}. Tu pedido ${ref} está confirmado.`,
    '',
    ...items.map((i) => `- ${i.name}${i.quantity ? ` x${i.quantity}` : ''}  ${i.total}`),
    ...extra.map(([k, v]) => `${k}: ${v}`),
    `Total pagado: ${formatMoney(order.total)}`,
    '',
    address.length ? `Envío a:\n${address.join('\n')}\n` : '',
    `${deliveryPromise}. Te enviaremos el número de rastreo cuando salga.`,
    '',
    `¿Dudas? ${site.email}`,
  ].join('\n');

  return { to: order.email, subject: `Pedido ${ref} confirmado · ${site.name}`, html, text, replyTo: site.email };
}

/** Aviso interno de nueva venta. */
export function newSaleEmail(order: Order, to: string, note?: string): EmailMessage {
  const items = lineItems(order);
  const ref = orderLabel(order);
  const text = [
    `Nueva venta ${ref} — ${formatMoney(order.total)}`,
    ...items.map((i) => `- ${i.name} x${i.quantity}`),
    `Cliente: ${order.email ?? 's/e'} ${order.phone ?? ''}`,
    note ?? (order.fulfillmentRef ? `Printify: ${order.fulfillmentRef}` : 'Crear el pedido en Printify.'),
  ].join('\n');
  return { to, subject: `💰 Nueva venta ${formatMoney(order.total)} · ${ref}`, text, html: `<pre style="font:14px Menlo,monospace">${esc(text)}</pre>` };
}
