import copy from '@/content/copy.json';
import { site } from '@/config/site';
import { catalog } from '@/infrastructure/container';
import { ProductCard } from '@/components/product-card';
import { Faq } from '@/components/faq';
import { JsonLd } from '@/components/json-ld';
import { faqLd, graph, organizationLd, websiteLd } from '@/lib/structured-data';

const PILLARS = [
  { area: 'Cuerpo', bearing: '000°', verb: 'ENTRENA', text: 'Salud como base. Un cuerpo fuerte sostiene una mente fuerte.' },
  { area: 'Mente', bearing: '090°', verb: 'LEE', text: 'Aprender es la ventaja que nadie te puede quitar.' },
  { area: 'Dinero', bearing: '180°', verb: 'PRODUCE', text: 'Construir, vender, emprender. El dinero es una realidad, no un tabú.' },
  { area: 'Carácter', bearing: '270°', verb: 'CUMPLE', text: 'Lo que dices, lo haces. Eso te separa del resto.' },
] as const;

export default function Home() {
  const h = copy.home;
  const products = catalog.all();
  return (
    <>
      <JsonLd data={graph(organizationLd(), websiteLd(), faqLd(h.faq))} />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow rise">Mentalidad 360°<span className="long"> · Cuerpo · Mente · Dinero · Carácter</span></p>
          <h1 className="lift">
            <span className="l1">Háblame de hacer dinero,</span>
            <span className="l2">no de gente.</span>
          </h1>
          <p className="lede rise d2">{h.heroLede}</p>
          <div className="ctas rise d3">
            <a className="btn" href="#tienda">Ver la colección</a>
            <a className="link-line" href="#pilares">Los 4 pilares</a>
          </div>
        </div>
        <div className="seal">
          <svg viewBox="0 0 400 400" aria-hidden="true">
            <defs><path id="ring" d="M200,200 m-186,0 a186,186 0 1,1 372,0 a186,186 0 1,1 -372,0" /></defs>
            <circle cx="200" cy="200" r="198" fill="none" stroke="#B89A5E" strokeOpacity=".45" />
            <circle cx="200" cy="200" r="172" fill="none" stroke="#B89A5E" strokeOpacity=".18" />
            <text fontFamily="var(--font-mono), monospace" fontSize="10.5" letterSpacing="3.2" fill="#A39E93">
              <textPath href="#ring">000° ENTRENA · 090° LEE · 180° PRODUCE · 270° CUMPLE · 000° ENTRENA · 090° LEE · 180° PRODUCE · 270° CUMPLE ·</textPath>
            </text>
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/sello.webp" srcSet="/img/sello-320.webp 320w, /img/sello.webp 640w" sizes="(max-width: 860px) 200px, 330px"
            width={640} height={640} fetchPriority="high" decoding="async"
            alt="Sello Actitud Alfa 360: ojo dentro de un triángulo sobre una brújula" />
        </div>
      </header>

      <ul className="bearings" aria-label="Los cuatro verbos">
        {PILLARS.map((p) => (<li key={p.verb}><span>{p.bearing}</span>{p.verb.toLowerCase()}</li>))}
      </ul>

      <section id="pilares" aria-labelledby="pilares-h">
        <div className="head">
          <div><p className="eyebrow">Los 4 rumbos</p><h2 id="pilares-h">Una vida a 360°</h2></div>
          <p>{h.pillarsIntro}</p>
        </div>
        <ol className="pillars">
          {PILLARS.map((p, i) => (
            <li className="pillar" key={p.verb}>
              <span className="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="meta"><span>{p.area}</span><span>{p.bearing}</span></div>
              <h3>{p.verb.charAt(0) + p.verb.slice(1).toLowerCase()}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="tienda" aria-labelledby="tienda-h">
        <div className="head">
          <div><p className="eyebrow">Colección 01</p><h2 id="tienda-h">Equipo para el día</h2></div>
          <p>{h.shopIntro}</p>
        </div>
        <div className="products">
          {products.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </section>

      <section id="manifiesto" className="manifesto band" aria-labelledby="manifiesto-h">
        <div className="mq">
          <p className="eyebrow">Manifiesto</p>
          <blockquote id="manifiesto-h">Menos opinión.<br /><em>Más ejecución.</em></blockquote>
        </div>
        <div className="text">{h.manifesto.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}</div>
      </section>

      <section id="preguntas" className="split" aria-labelledby="preguntas-h">
        <div className="head">
          <div><p className="eyebrow">Preguntas frecuentes</p><h2 id="preguntas-h">Lo que te estás preguntando</h2></div>
          <p>¿Algo más? Escríbenos a <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
        </div>
        <Faq items={h.faq} />
      </section>
    </>
  );
}
