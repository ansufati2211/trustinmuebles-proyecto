import type { EstadoSemaforo, TipoInmueble } from "./types";

/**
 * Filtros del catálogo (M13). La URL usa los mismos nombres que la API (tipoInmueble, estado, estadoTecnico,
 * riesgoFisicoDetectado), así un enlace compartido o recargado muestra lo mismo y se envía tal cual al servidor.
 * «q» es la búsqueda por número o texto: vive en la URL pero se resuelve en el navegador.
 */
export type FiltroB = "" | "NO_SOLICITADA" | "SOLICITADA" | "EN_INSPECCION" | "INFORME_EMITIDO" | "RIESGO";

export interface Filtros {
  tipo: "" | TipoInmueble;
  indicadorA: "" | EstadoSemaforo;
  indicadorB: FiltroB;
  q: string;
}

export const FILTROS_VACIOS: Filtros = { tipo: "", indicadorA: "", indicadorB: "", q: "" };

export const OPCIONES_TIPO: { valor: TipoInmueble; etiqueta: string }[] = [
  { valor: "VIVIENDA_URBANA", etiqueta: "Vivienda urbana" },
  { valor: "LOTE_URBANO", etiqueta: "Lote urbano" },
];

export const OPCIONES_A: { valor: EstadoSemaforo; etiqueta: string }[] = [
  { valor: "VERDE", etiqueta: "Verde · sin alertas en los campos evaluados" },
  { valor: "AMARILLO", etiqueta: "Amarillo · requiere revisión" },
  { valor: "ROJO", etiqueta: "Rojo · alerta prioritaria" },
  { valor: "GRIS", etiqueta: "Gris · información insuficiente" },
];

export const OPCIONES_B: { valor: Exclude<FiltroB, "">; etiqueta: string }[] = [
  { valor: "NO_SOLICITADA", etiqueta: "No solicitada" },
  { valor: "SOLICITADA", etiqueta: "Solicitada" },
  { valor: "EN_INSPECCION", etiqueta: "En inspección" },
  { valor: "INFORME_EMITIDO", etiqueta: "Informe emitido" },
  { valor: "RIESGO", etiqueta: "Con riesgo físico detectado" },
];

const valido = <T extends string>(v: string | null, opciones: { valor: T }[]): T | "" =>
  v !== null && opciones.some((o) => o.valor === v) ? (v as T) : "";

/** Lee los filtros de la URL. Un valor desconocido se ignora en lugar de vaciar el catálogo. */
export function filtrosDesdeURL(p: URLSearchParams): Filtros {
  const riesgo = p.get("riesgoFisicoDetectado") === "true";
  const tecnico = p.get("estadoTecnico") === "EMITIDO" ? "INFORME_EMITIDO" : p.get("estadoTecnico");
  return {
    tipo: valido(p.get("tipoInmueble"), OPCIONES_TIPO),
    indicadorA: valido(p.get("estado"), OPCIONES_A),
    indicadorB: riesgo ? "RIESGO" : valido(tecnico, OPCIONES_B),
    q: (p.get("q") ?? "").slice(0, 40),
  };
}

/** Parámetros que entiende el servidor: solo los filtros, sin la búsqueda de texto. */
function parametrosServidor(f: Filtros): URLSearchParams {
  const p = new URLSearchParams();
  if (f.tipo) p.set("tipoInmueble", f.tipo);
  if (f.indicadorA) p.set("estado", f.indicadorA);
  if (f.indicadorB === "RIESGO") p.set("riesgoFisicoDetectado", "true");
  else if (f.indicadorB) p.set("estadoTecnico", f.indicadorB);
  return p;
}

/** Escribe los filtros en la URL, en un orden fijo y sin los vacíos. */
export function filtrosAURL(f: Filtros): URLSearchParams {
  const p = parametrosServidor(f);
  if (f.q.trim()) p.set("q", f.q.trim());
  return p;
}

/** Ruta de la API del catálogo con los filtros aplicados. */
export function rutaCatalogo(f: Filtros): string {
  const p = parametrosServidor(f).toString();
  return p ? `/casos?${p}` : "/casos";
}

export const hayFiltros = (f: Filtros) => !!(f.tipo || f.indicadorA || f.indicadorB || f.q.trim());

/** Texto del contador: «1 inmueble», «4 inmuebles», «Ningún inmueble». */
export const textoResultados = (n: number) => (n === 0 ? "Ningún inmueble" : n === 1 ? "1 inmueble" : `${n} inmuebles`);
