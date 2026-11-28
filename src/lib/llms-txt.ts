import { copy } from '@/content';
import { site } from '@/config/site';
import { formatMoney, usd } from '@/domain/money';
import { defaultVariant, displayName, type Product } from '@/domain/product';

const range = (r: { min: number; max: number }) => `${r.min}–${r.max}`;

/** /llms.txt (https://llmstxt.org): resumen en Markdown para que un LLM lea el sitio como hecho. Todo sale del catálogo y de `site`. */
export function llmsTxt(products: readonly Product[], shippingCents: number): string {
  const shipping = shippingCents === 0 ? 'envío gratis' : `envío fijo ${formatMoney(usd(shippingCents))}`;
  const lines = [
    `# ${site.name}`,
    '',
    `> ${copy.organization.description} Lema: "${site.slogan}"`,
    '',
    '## Productos',
    ...products.map((p) => {
      const v = defaultVariant(p);
      return `- [${displayName(p)}](${site.url}/productos/${p.slug}): ${p.subtitle ?? p.shortPitch} ${formatMoney(v.price)}.`;
    }),
    '',
    '## Envíos y devoluciones',
    `- [Políticas](${site.url}/politicas): solo EE. UU., ${shipping}, producción ${range(site.shipping.handlingDays)} días hábiles + entrega ${range(site.shipping.transitDays)} días hábiles.`,
    `- Todo se fabrica a pedido: no hay devolución por cambio de opinión. Reemplazo o reembolso por daño o defecto dentro de ${site.returns.days} días.`,
    '',
    '## Empresa',
    `- ${site.legalName}, Florida (EE. UU.). Contacto: ${site.email}`,
    '',
  ];
  return lines.join('\n');
}
