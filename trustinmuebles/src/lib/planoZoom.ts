/*
 * v2.0 (tanda 1, RF43): movimiento (pan) y zoom del plano de la lotización, sin librerías. La vista es una escala `k` y un
 * desplazamiento (x, y) en píxeles del recuadro que muestra el plano; la imagen siempre cubre el recuadro (no se puede
 * arrastrar hasta dejar un hueco). Funciones puras: el componente solo las llama con lo que dicen el mouse o los dedos.
 */

export interface Vista { k: number; x: number; y: number }

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;
export const VISTA_INICIAL: Vista = { k: 1, x: 0, y: 0 };

const entre = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Deja la vista dentro de los límites: escala entre 1× y 6×, y la imagen cubriendo todo el recuadro de w × h píxeles. */
export function acotarVista(v: Vista, w: number, h: number): Vista {
  const k = entre(Number.isFinite(v.k) ? v.k : 1, ZOOM_MIN, ZOOM_MAX);
  return { k, x: entre(v.x, Math.min(0, w * (1 - k)), 0), y: entre(v.y, Math.min(0, h * (1 - k)), 0) };
}

/** Cambia la escala dejando quieto el punto (cx, cy) del recuadro: lo que está bajo el cursor o entre los dedos. */
export function zoomEn(v: Vista, nuevaK: number, cx: number, cy: number, w: number, h: number): Vista {
  const k = entre(nuevaK, ZOOM_MIN, ZOOM_MAX);
  const r = k / v.k;
  return acotarVista({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }, w, h);
}

/** Mueve la vista dx, dy píxeles (arrastrar). */
export const mover = (v: Vista, dx: number, dy: number, w: number, h: number): Vista =>
  acotarVista({ ...v, x: v.x + dx, y: v.y + dy }, w, h);

/** Centra el punto (fx, fy), en fracciones de la imagen, en el recuadro, con la escala dada. */
export const centrarEn = (fx: number, fy: number, k: number, w: number, h: number): Vista =>
  acotarVista({ k, x: w / 2 - fx * w * k, y: h / 2 - fy * h * k }, w, h);

/** ¿Está el punto (fx, fy) dentro del recuadro, con un margen en píxeles? */
export function esVisible(v: Vista, fx: number, fy: number, w: number, h: number, margen = 24): boolean {
  const px = v.x + fx * w * v.k, py = v.y + fy * h * v.k;
  return px >= margen && px <= w - margen && py >= margen && py <= h - margen;
}

/** Factor de la rueda del mouse: deltaY negativo acerca, positivo aleja (unos 15 % por «click» de 100). */
export const factorRueda = (deltaY: number): number => Math.pow(1.0016, -deltaY);

/** Pasos de los botones «+» y «−»: de uno en uno entre 1× y 6×. */
export const siguienteNivel = (k: number, sentido: 1 | -1): number => entre(Math.round(k) + sentido, ZOOM_MIN, ZOOM_MAX);

/** Tamaño en pantalla del marcador de un lote: crece un poco con el zoom (de 13 a 30 px) para tocarlo y leerlo bien. */
export const tamanoMarcador = (k: number): number => Math.round(entre(13 + (k - 1) * 3.4, 13, 30));

/** El zoom desde el que se escribe la etiqueta del estado junto a un lote separado o vendido. */
export const ZOOM_ETIQUETA = 2.5;

/** Un nombre legible de la escala: «1×», «2,5×». */
export const textoZoom = (k: number): string => `${(Math.round(k * 10) / 10).toString().replace(".", ",")}×`;

export interface Punto { x: number; y: number }
export const distancia = (a: Punto, b: Punto): number => Math.hypot(a.x - b.x, a.y - b.y);
export const puntoMedio = (a: Punto, b: Punto): Punto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
