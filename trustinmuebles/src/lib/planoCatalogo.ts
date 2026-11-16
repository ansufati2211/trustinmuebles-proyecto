import type { InmuebleRecomendable } from "./types";

/*
 * v1.0 (etapa 14): lógica de la vista «Plano» del catálogo. Parte de los inmuebles que cumplen los filtros (los mismos
 * «recomendables» que usa el asistente): de ahí salen los proyectos que tienen lotes y cuáles lotes resaltar en el plano.
 */

export type VistaCatalogo = "lista" | "plano";

export interface ProyectoConLotes { codigo: string; nombre: string; coinciden: number }

/** Los proyectos con lotes que cumplen los filtros: primero el que más lotes tiene, luego por nombre. */
export function proyectosConLotes(items: InmuebleRecomendable[]): ProyectoConLotes[] {
  const por = new Map<string, ProyectoConLotes>();
  for (const i of items) {
    if (i.clase !== "LOTE_PROYECTO" || !i.proyectoCodigo || !i.lote) continue;
    const p = por.get(i.proyectoCodigo) ?? { codigo: i.proyectoCodigo, nombre: i.predio.proyecto ?? i.proyectoCodigo, coinciden: 0 };
    p.coinciden++;
    por.set(i.proyectoCodigo, p);
  }
  return [...por.values()].sort((a, b) => b.coinciden - a.coinciden || a.nombre.localeCompare(b.nombre, "es"));
}

/** Las claves («228A-10A») de los lotes de un proyecto que cumplen los filtros. */
export function clavesQueCoinciden(items: InmuebleRecomendable[], proyectoCodigo: string): Set<string> {
  const s = new Set<string>();
  for (const i of items) if (i.clase === "LOTE_PROYECTO" && i.proyectoCodigo === proyectoCodigo && i.lote) s.add(i.lote);
  return s;
}

/** El proyecto con el que abre el plano: el del filtro «Proyecto» si tiene lotes que cumplen; si no, el primero. */
export function proyectoInicial(lista: ProyectoConLotes[], filtroProyecto: string): string | null {
  const f = filtroProyecto.trim().toLocaleLowerCase("es");
  const elegido = f ? lista.find((p) => p.nombre.toLocaleLowerCase("es") === f) : undefined;
  return (elegido ?? lista[0])?.codigo ?? null;
}

/** La vista en la URL: «?vista=plano» solo cuando es el plano; la lista no lleva parámetro. */
export function conVista(params: URLSearchParams, vista: VistaCatalogo): URLSearchParams {
  const p = new URLSearchParams(params);
  if (vista === "plano") p.set("vista", "plano");
  else p.delete("vista");
  return p;
}

export const vistaDeLaUrl = (params: URLSearchParams): VistaCatalogo => (params.get("vista") === "plano" ? "plano" : "lista");
