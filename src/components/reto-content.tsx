import Link from 'next/link';
import { copy } from '@/content';
import { site } from '@/config/site';
import { formatMoneyShort, usd } from '@/domain/money';
import { EmailCapture } from './email-capture';
import { Faq } from './faq';

/** Texto con una parte en negrita: [antes, negrita, después] (así el copy no lleva HTML). */
const Rule = ({ parts: [a, b, c] }: { parts: readonly string[] }) => <>{a}<b>{b}</b>{c}</>;

/** Contenido de /reto-30-dias (sin el JSON-LD, que pone la página). Reglas: borrador del CTO desde copy.json (decisión B). */
export function RetoContent() {
  const r = copy.reto;
  return (
    <>
      <div className="wrap">
        <nav className="crumbs" aria-label="Migas de pan">
          <ol><li><Link href="/">Inicio</Link></li><li aria-current="page">{r.crumb}</li></ol>
        </nav>
        <div className="reto-hero">
          <div className="hero-copy appear">
            <p className="eyebrow">{r.eyebrow}</p>
            <h1 className="display">{r.h1}</h1>
            <p className="lede">{r.lede}</p>
            <EmailCapture source="reto" text={copy.capture} />
          </div>
          <div role="group" aria-label={r.factsLabel}><dl className="facts appear d2">
            {r.facts.map((f) => <div key={f.l}><dt className="num">{f.v}</dt><dd>{f.l}</dd></div>)}
          </dl></div>
        </div>
      </div>

      <section className="sec" id="reglas" aria-labelledby="h-reglas">
        <div className="wrap">
          <div className="sec-head">
            <p className="eyebrow">{r.rules.eyebrow}</p>
            <h2 id="h-reglas">{r.rules.h2}</h2>
            <p className="lede">{r.rules.lede}</p>
          </div>
          <table className="rules">
            <caption className="sr-only">{r.rules.caption}</caption>
            <thead><tr><th scope="col">{r.rules.colPillar}</th><th scope="col">{r.rules.colBase}</th><th scope="col">{r.rules.colStd}</th></tr></thead>
            <tbody>
              {copy.pillars.map((p) => (
                <tr key={p.id} id={`regla-${p.id}`}>
                  <th scope="row"><span className="rn">{p.rn}</span><span className="pn">{p.name}</span><span className="pv">{p.verb}</span></th>
                  <td data-label={r.rules.colBase}><Rule parts={p.base} /></td>
                  <td data-label={r.rules.colStd}><Rule parts={p.estandar} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec band" aria-labelledby="h-fallas">
        <div className="wrap split">
          <div className="stack"><p className="eyebrow">{r.fail.eyebrow}</p><h2 id="h-fallas">{r.fail.h2}</h2></div>
          <div className="callout">{r.fail.paras.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-dia">
        <div className="wrap">
          <div className="sec-head"><p className="eyebrow">{r.day.eyebrow}</p><h2 id="h-dia">{r.day.h2}</h2></div>
          <ol className="steps">{r.day.steps.map((s) => <li key={s.h}><div><h3>{s.h}</h3><p>{s.p}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="sec band" aria-labelledby="h-despues">
        <div className="wrap">
          <div className="member">
            <div className="stack">
              <p className="eyebrow">{r.after.eyebrow}</p>
              <div className="member-name"><h2 id="h-despues" className="h3">{r.after.h2}</h2><span className="price num">{formatMoneyShort(usd(site.membership.priceCents))} <small>{copy.home.member.per}</small></span></div>
              <p className="lede">{r.after.lede}</p>
            </div>
            <div className="stack">
              <a className="btn ghost" href="#empieza-membresia">{r.after.cta}</a>
              <p className="micro">{r.after.micro}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-faq-reto">
        <div className="wrap">
          <div className="sec-head"><p className="eyebrow">{r.faqHead.eyebrow}</p><h2 id="h-faq-reto">{r.faqHead.h2}</h2></div>
          <Faq items={r.faq} />
          <p className="health">{r.health}</p>
        </div>
      </section>

      <section className="sec band" id="empieza" aria-labelledby="h-cierre-reto">
        <div className="wrap closing">
          <h2 id="h-cierre-reto">{r.closing}</h2>
          <span id="empieza-membresia" aria-hidden="true" />
          <EmailCapture source="reto" text={copy.capture} membershipHash="empieza-membresia" />
        </div>
      </section>
    </>
  );
}
