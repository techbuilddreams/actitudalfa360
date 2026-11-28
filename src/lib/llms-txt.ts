import { copy } from '@/content';
import { site } from '@/config/site';
import { formatMoney, usd } from '@/domain/money';
import { policyPhrases } from '@/lib/policy-facts';
import { shippingNote } from '@/lib/price-notes';
import { defaultVariant, displayName, type Product } from '@/domain/product';

const mdText = (s: string) => s.replace(/[[\]]/g, '\\$&');

/** /llms.txt (https://llmstxt.org): resumen en Markdown para que un LLM lea el sitio como hecho. Todo sale del catálogo y de `site`. */
export function llmsTxt(products: readonly Product[], shippingCents: number, automaticTax = false): string {
  const f = policyPhrases();
  const lines = [
    `# ${site.name}`,
    '',
    `> ${copy.organization.description} Lema: "${site.slogan}"`,
    '',
    '## Productos',
    ...products.map((p) => {
      const v = defaultVariant(p);
      return `- [${mdText(displayName(p))}](${site.url}/productos/${p.slug}): ${p.subtitle ?? p.shortPitch} ${formatMoney(v.price)}.`;
    }),
    '',
    '## Envíos y devoluciones',
    `- [Políticas](${site.url}/politicas): envíos ${f.onlyUs}, ${shippingNote(usd(shippingCents), automaticTax)}, producción ${f.handling} + entrega ${f.transit}.`,
    `- Todo se fabrica a pedido: ${f.noReturns}. Si llega ${f.defectKinds}, escríbenos a ${site.email} ${f.defectWindow} ${f.claimHow}: reemplazo o reembolso sin costo.`,
    '',
    '## Empresa',
    `- ${site.legalName}, ${site.legalState} (EE. UU.). Contacto: ${site.email}`,
    '',
  ];
  return lines.join('\n');
}
