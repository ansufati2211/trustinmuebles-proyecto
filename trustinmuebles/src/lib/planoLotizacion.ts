/*
 * v1.0 (etapa 11): plano de la lotización de un proyecto con la posición de cada lote. El plano es una imagen que entrega
 * la inmobiliaria y las posiciones están en public/planos/{proyecto}.json (fracciones de 0 a 1 del ancho y del alto de la
 * imagen). No hay mapa embebido ni servicios externos: si un proyecto no tiene plano, simplemente no se muestra.
 */

export interface PlanoLotizacion {
  proyecto: string;
  /** Ruta de la imagen dentro del sitio. */
  imagen: string;
  /** Tamaño en píxeles de la imagen publicada (solo sirve para su proporción). */
  ancho: number;
  alto: number;
  /** De dónde sale y qué tan firme es la ubicación. */
  fuente?: string;
  /** Posición del centro de cada lote por su clave («228A-10A»): [x, y] en fracciones de la imagen. */
  lotes: Record<string, [number, number]>;
}

/** La parte de la imagen que se ve, en fracciones: esquina (x, y) y tamaño (w, h). */
export interface Ventana { x: number; y: number; w: number; h: number }

export const VENTANA_COMPLETA: Ventana = { x: 0, y: 0, w: 1, h: 1 };

export const rutaPlano = (codigo: string) => `/planos/${encodeURIComponent(codigo)}.json`;

const esFraccion = (n: unknown) => typeof n === "number" && n >= 0 && n <= 1;

/** ¿Es el JSON de un plano? (un servidor que devuelve la página de inicio en vez del archivo no lo es). */
export function esPlano(x: unknown): x is PlanoLotizacion {
  if (!x || typeof x !== "object") return false;
  const p = x as Partial<PlanoLotizacion>;
  if (typeof p.imagen !== "string" || !p.imagen.startsWith("/") || !(Number(p.ancho) > 0) || !(Number(p.alto) > 0)) return false;
  if (!p.lotes || typeof p.lotes !== "object") return false;
  return Object.values(p.lotes).every((v) => Array.isArray(v) && v.length === 2 && esFraccion(v[0]) && esFraccion(v[1]));
}

const cache = new Map<string, Promise<PlanoLotizacion | null>>();

/** El plano de un proyecto, o null si no tiene (o no se pudo leer). Se pide una sola vez por proyecto. */
export function cargarPlano(codigo: string): Promise<PlanoLotizacion | null> {
  let p = cache.get(codigo);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(rutaPlano(codigo));
        if (!r.ok) return null;
        const j: unknown = await r.json();
        return esPlano(j) ? j : null;
      } catch {
        return null;
      }
    })();
    cache.set(codigo, p);
  }
  return p;
}

/** Solo para pruebas. */
export const olvidarPlanos = () => cache.clear();

const acotar = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * Ventana de 4:3 centrada en el lote, que cubre `ancho` del ancho de la imagen (unas ocho celdas de ancho con 0,16),
 * sin salirse de la imagen. Null si el plano no tiene ese lote.
 */
export function ventanaDe(plano: PlanoLotizacion, clave: string, ancho = 0.16): Ventana | null {
  const pos = plano.lotes[clave];
  if (!pos) return null;
  const w = ancho;
  const h = (w * plano.ancho * 0.75) / plano.alto;
  return { x: acotar(pos[0] - w / 2, 0, 1 - w), y: acotar(pos[1] - h / 2, 0, 1 - h), w, h };
}

/** Dónde cae un punto dentro de la ventana, en porcentaje de su ancho y su alto. */
export function posicionEnVentana(pos: [number, number], v: Ventana): { izq: number; arr: number } {
  return { izq: ((pos[0] - v.x) / v.w) * 100, arr: ((pos[1] - v.y) / v.h) * 100 };
}
