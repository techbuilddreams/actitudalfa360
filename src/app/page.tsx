import type { Metadata } from 'next';
import Link from 'next/link';
import { copy } from '@/content';
import { site } from '@/config/site';
import { addMoney, formatMoney, usd } from '@/domain/money';
import { defaultVariant } from '@/domain/product';
import { catalog } from '@/infrastructure/container';
import { EmailCapture } from '@/components/email-capture';
import { Faq } from '@/components/faq';
import { JsonLd } from '@/components/json-ld';
import { KitCard, ProductCard } from '@/components/product-card';
import { faqLd, graph, organizationLd, websiteLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: { absolute: copy.home.title },
  description: copy.home.description,
  alternates: { canonical: '/' },
};

export default function Home() {
  const h = copy.home;
  const products = catalog.all();
  const [first, second] = products;

  return (
    <>
      <JsonLd data={graph(organizationLd(), websiteLd(), faqLd(h.faq))} />

      <div className="wrap hero">
        <div className="hero-grid">
          <div className="hero-copy appear">
            <p className="eyebrow">{h.eyebrow}</p>
            <h1 className="display">{h.h1}</h1>
            <p className="lede">{h.lede}</p>
            <EmailCapture source="home" text={copy.capture} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-seal appear d2" src="/img/sello-320.webp" srcSet="/img/sello-320.webp 320w, /img/sello.webp 640w"
            sizes="(min-width: 900px) 360px, 88px" width={360} height={360} fetchPriority="high" decoding="async" alt={h.sealAlt} />
        </div>
      </div>

      <section className="sec" id="pilares" aria-labelledby="h-pilares">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">{h.pillars.eyebrow}</p>
            <h2 id="h-pilares">{h.pillars.h2}</h2>
            <p className="lede">{h.pillars.lede}</p>
          </div>
          {/* Sin páginas de pilar todavía: cada pilar lleva a sus reglas del reto. */}
          <ul className="pillars">
            {copy.pillars.map((p) => (
              <li key={p.id}>
                <Link className="pillar" href={`/reto-30-dias#regla-${p.id}`}>
                  <span className="rn" aria-hidden="true">{p.rn}</span><span className="pname">{p.name}</span>
                  <span className="verb">{p.verb}</span><span className="pdesc">{p.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-como">
        <div className="wrap">
          <div className="sec-head"><p className="eyebrow">{h.how.eyebrow}</p><h2 id="h-como">{h.how.h2}</h2></div>
          <ol className="steps">{h.how.steps.map((s) => <li key={s.h}><div><h3>{s.h}</h3><p>{s.p}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="sec band" aria-labelledby="h-registro">
        <div className="wrap split">
          <div className="stack">
            <p className="eyebrow">{h.registro.eyebrow}</p>
            <h2 id="h-registro">{h.registro.h2}</h2>
            <p className="lede">{h.registro.lede}</p>
          </div>
          {/* Ejemplo estático: muestra el registro, no es un control. */}
          <figure className="registro" aria-labelledby="registro-cap">
            <div className="registro-top">
              <span className="q" aria-hidden="true">{h.registro.q}</span>
              <figcaption className="ex" id="registro-cap">{h.registro.example}</figcaption>
            </div>
            <ul>
              {h.registro.rows.map((r) => (
                <li key={r.verb}>
                  <span className={`box${r.done ? ' on' : ''}`} aria-hidden="true" />
                  <span><span className="r-verb">{r.verb}</span><span className="r-task">{r.task}</span>
                    <span className="sr-only"> · {r.done ? h.registro.doneLabel : h.registro.notDoneLabel}</span></span>
                </li>
              ))}
            </ul>
            <div className="score"><span>{h.registro.today} <b className="num">{h.registro.todayValue}</b></span><span>{h.registro.total} <b className="num">{h.registro.totalValue}</b></span></div>
          </figure>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-manif">
        <div className="wrap manif">
          <h2 id="h-manif" className="h2">{h.manifesto.h2}</h2>
          <p className="lede">{h.manifesto.lede}</p>
        </div>
      </section>

      <section className="sec band" id="membresia" aria-labelledby="h-member">
        <div className="wrap">
          <div className="member">
            <div className="stack">
              <p className="eyebrow">{h.member.eyebrow}</p>
              <div className="member-name"><h2 id="h-member" className="h3">{h.member.h2}</h2><span className="price num">{formatMoney(usd(site.membership.priceCents))} <small>{h.member.per}</small></span></div>
              <p className="lede">{h.member.lede}</p>
              {/* Decisión 10: no se vende aún. El aviso es el mismo alta del reto. */}
              <a className="btn ghost" href="#empieza">{h.member.cta}</a>
              <p className="micro">{h.member.micro}</p>
            </div>
            <ul className="checks" aria-label={h.member.listLabel}>{h.member.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="sec" id="tienda" aria-labelledby="h-tienda">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">{h.shop.eyebrow}</p>
            <h2 id="h-tienda">{h.shop.h2}</h2>
            <p className="lede">{h.shop.lede}</p>
          </div>
          <div className="shop">
            {products.map((p) => <ProductCard key={p.slug} product={p} />)}
            {first && second && (
              <KitCard first={first} second={second} name={h.shop.kitName} line={h.shop.kitLine}
                total={addMoney(defaultVariant(first).price, defaultVariant(second).price)} />
            )}
          </div>
        </div>
      </section>

      <section className="sec" aria-label={h.trustLabel}>
        <div className="wrap trust">
          {h.trust.map((x) => <div key={x.b}><b>{x.b}</b><span>{x.t}</span></div>)}
        </div>
      </section>

      <section className="sec" aria-labelledby="h-faq">
        <div className="wrap">
          <div className="sec-head"><p className="eyebrow">{h.faqHead.eyebrow}</p><h2 id="h-faq">{h.faqHead.h2}</h2></div>
          <Faq items={h.faq} />
        </div>
      </section>

      <section className="sec band" id="empieza" aria-labelledby="h-cierre">
        <div className="wrap closing">
          <h2 id="h-cierre">{h.closing}</h2>
          <EmailCapture source="home" text={copy.capture} />
        </div>
      </section>
    </>
  );
}
