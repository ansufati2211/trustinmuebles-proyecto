import type { EstadoPublicacion, EstadoSemaforo, PanelCartera, ResumenCaso } from "./types";

export const COLORES: EstadoSemaforo[] = ["VERDE", "AMARILLO", "ROJO", "GRIS"];
export const ESTADOS_PUBLICACION: EstadoPublicacion[] = ["BORRADOR", "PUBLICADO", "RETIRADO"];

export const ETIQUETA_PUBLICACION: Record<EstadoPublicacion, string> = {
  BORRADOR: "Borrador", PUBLICADO: "Publicado", RETIRADO: "Retirado",
};

/** Totales que muestra el panel. «sinEvaluar» cuenta casos que aún no tienen evaluación (estado null). */
export interface Totales {
  total: number;
  porColor: Record<EstadoSemaforo, number>;
  sinEvaluar: number;
  porPublicacion: Record<EstadoPublicacion, number>;
}

const ceros = <K extends string>(claves: K[]) =>
  Object.fromEntries(claves.map((k) => [k, 0])) as Record<K, number>;

/** Cuenta una lista de casos por color de A y por estado de publicación. Lista vacía o ausente: todo en cero. */
export function totalesDeCasos(casos: ResumenCaso[] | null | undefined): Totales {
  const t: Totales = { total: 0, porColor: ceros(COLORES), sinEvaluar: 0, porPublicacion: ceros(ESTADOS_PUBLICACION) };
  for (const c of casos ?? []) {
    t.total++;
    if (c.estado) t.porColor[c.estado]++;
    else t.sinEvaluar++;
    if (c.estadoPublicacion) t.porPublicacion[c.estadoPublicacion]++;
  }
  return t;
}

/**
 * Totales del panel tal como los envía el servidor, con ceros donde falte una clave o un número. Los cuenta el servidor:
 * la interfaz no los recalcula ni los corrige.
 */
export function totalesDelPanel(p: Partial<PanelCartera> | null | undefined): Totales {
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  const porColor = ceros(COLORES);
  for (const c of COLORES) porColor[c] = num(p?.porColor?.[c]);
  const porPublicacion = ceros(ESTADOS_PUBLICACION);
  for (const e of ESTADOS_PUBLICACION) porPublicacion[e] = num(p?.porEstadoPublicacion?.[e]);
  const total = num(p?.totalCasos);
  const evaluados = COLORES.reduce((s, c) => s + porColor[c], 0);
  return { total, porColor, sinEvaluar: Math.max(0, total - evaluados), porPublicacion };
}

/** Filtros de la lista del panel. Vacío significa «todos». Se combinan con «y». */
export interface FiltroCartera { color: "" | EstadoSemaforo; publicacion: "" | EstadoPublicacion; q: string }

export const FILTRO_CARTERA_VACIO: FiltroCartera = { color: "", publicacion: "", q: "" };

/** Filtra en el navegador la lista del gestor (ya la entregó el servidor completa). */
export function filtrarCartera(casos: ResumenCaso[] | null | undefined, f: FiltroCartera): ResumenCaso[] {
  const q = f.q.trim().toLowerCase();
  return (casos ?? []).filter((c) =>
    (!f.color || c.estado === f.color)
    && (!f.publicacion || c.estadoPublicacion === f.publicacion)
    && (!q || c.codigo.toLowerCase().includes(q) || c.denominacion.toLowerCase().includes(q)
      || (c.predio?.distrito ?? "").toLowerCase().includes(q)));
}
