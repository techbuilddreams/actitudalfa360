import type { ProductImage } from '@/domain/product';

/**
 * Fotos sobre el "escenario" marfil. Las variantes en /img/stage/ tienen el fondo blanco
 * de origen ya teñido al tono del escenario (sin mezclas en tiempo real).
 */
function staged(src: string): { src: string; srcSet?: string } {
  const m = /^\/img\/([\w-]+)\.webp$/.exec(src);
  if (!m) return { src };
  const base = `/img/stage/${m[1]}`;
  return { src: `${base}.webp`, srcSet: `${base}-800.webp 800w, ${base}.webp 1200w` };
}

const CARD_SIZES = '(max-width: 760px) calc(100vw - 40px), (max-width: 1280px) 46vw, 580px';
const PDP_SIZES = '(max-width: 900px) 86vw, (max-width: 1280px) 52vw, 640px';

/** Imagen de tarjeta: la segunda cara aparece al pasar el cursor (solo decorativa). */
export function ProductPlate({ images, tag }: { images: readonly ProductImage[]; tag?: string }) {
  const [main, second] = images;
  const a = staged(main.src);
  const b = second ? staged(second.src) : undefined;
  return (
    <div className={`stage${b ? ' has-alt' : ''}`}>
      {tag && <span className="tag">{tag}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="main" src={a.src} srcSet={a.srcSet} sizes={CARD_SIZES} alt={main.alt}
        width={main.width} height={main.height} loading="lazy" decoding="async" />
      {b && second && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="alt" src={b.src} srcSet={b.srcSet} sizes={CARD_SIZES} alt=""
          width={second.width} height={second.height} loading="lazy" decoding="async" />
      )}
    </div>
  );
}

/** Galería de la ficha: fotos apiladas en escritorio, carrusel con scroll-snap en móvil (sin JS). */
export function ProductGallery({ images, tag }: { images: readonly ProductImage[]; tag?: string }) {
  return (
    <div className="pdp-gallery" role="group" aria-label="Fotos del producto">
      {images.map((img, i) => {
        const s = staged(img.src);
        return (
          <figure className="stage" key={img.src}>
            {i === 0 && tag && <span className="tag">{tag}</span>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} srcSet={s.srcSet} sizes={PDP_SIZES} alt={img.alt} width={img.width} height={img.height}
              loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} decoding="async" />
            {images.length > 1 && (
              <figcaption className="count" aria-hidden="true">{String(i + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
