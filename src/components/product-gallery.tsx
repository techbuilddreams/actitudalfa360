import type { ProductImage } from '@/domain/product';

/**
 * Fotos sobre el "escenario" de papel. Las variantes en /img/stage/ tienen el fondo blanco
 * de origen ya teñido al tono del escenario (sin mezclas en tiempo real).
 */
export function staged(src: string): { src: string; srcSet?: string } {
  const m = /^\/img\/([\w-]+)\.webp$/.exec(src);
  if (!m) return { src };
  const base = `/img/stage/${m[1]}`;
  return { src: `${base}.webp`, srcSet: `${base}-800.webp 800w, ${base}.webp 1200w` };
}

const PDP_SIZES = '(min-width: 900px) 56vw, calc(100vw - 32px)';

/** Galería de la ficha: fotos apiladas en escritorio, carrusel con scroll-snap en móvil (sin JS). */
export function ProductGallery({ images }: { images: readonly ProductImage[] }) {
  return (
    <div className="gallery" role="group" aria-label="Fotos del producto" tabIndex={images.length > 1 ? 0 : undefined}>
      {images.map((img, i) => {
        const s = staged(img.src);
        return (
          <figure className="stage" key={img.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} srcSet={s.srcSet} sizes={PDP_SIZES} alt={img.alt} width={img.width} height={img.height}
              loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} decoding="async" />
            {images.length > 1 && <figcaption className="count" aria-hidden="true">{i + 1} / {images.length}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}
