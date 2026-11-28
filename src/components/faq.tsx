import type { Faq as FaqItem } from '@/domain/product';

/** Preguntas en <details>: la primera abierta, como en la maqueta. */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.q} open={i === 0}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
