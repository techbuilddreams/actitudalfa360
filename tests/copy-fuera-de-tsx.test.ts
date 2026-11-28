import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** El texto visible vive en copy.json: estas frases no pueden volver a escribirse en un componente. */
const DIR = join(__dirname, '../src/components');
const sources = readdirSync(DIR).filter((f) => /\.tsx?$/.test(f)).map((f) => [f, readFileSync(join(DIR, f), 'utf8')] as const);
const PHRASES = [
  'Reto gratis', 'Reto de 30', 'Pídela hoy', 'llega aprox', 'Llega en', 'días hábiles', 'Abriendo pago',
  'No se pudo', 'Intenta de nuevo', 'Quitar una', 'Agregar una', 'Cantidad elegida', "'Cantidad'",
  "'Reto'", "'Pilares'", "'Tienda'", "'Membresía'", '>Reto<', '>Pilares<', '>Tienda<', '>Membresía<',
  'Envíos y devoluciones', '>Privacidad<', '>Términos<', "'Menú'", "'Cerrar'", '"Principal"',
];

describe('copy fuera de los componentes', () => {
  it.each(PHRASES)('ningún componente escribe %j a mano', (phrase) => {
    expect(sources.filter(([, src]) => src.includes(phrase)).map(([f]) => f)).toEqual([]);
  });
});
