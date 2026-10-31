import { ESTADOS } from "./semaforo";
import type { EntradaHistorial, EstadoSemaforo, OrigenEvaluacion } from "./types";

export const ETIQUETA_ORIGEN: Record<OrigenEvaluacion, string> = {
  EDICION: "Edición del expediente",
  PLANO_ADJUNTO: "Plano incorporado o adjuntado",
  PARTIDA_TRANSCRITA: "Partida transcrita incorporada",
  PARTIDA_SIMULADA: "Partida simulada incorporada",
  CARGA_INICIAL: "Carga inicial",
};

/** Una entrada del historial lista para mostrarse. No agrega datos: lo que no envió el servidor queda vacío. */
export interface EntradaLinea {
  clave: string;
  fecha: string;
  anterior: EstadoSemaforo | null;
  nuevo: EstadoSemaforo;
  transicion: string;
  cambioDeColor: boolean;
  origen: string;
  cuenta: string;
  motivos: string[];
  faltantes: string[];
  versionReglas: string;
}

const nombre = (e: EstadoSemaforo) => ESTADOS[e]?.nombre ?? e;

/** «12 de octubre de 2026, 10:05». Una fecha inválida o ausente se muestra vacía en lugar de «Invalid Date». */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-PE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** «Amarillo → Verde», o «Primera evaluación: Verde» cuando no hay color anterior. */
export function transicion(anterior: EstadoSemaforo | null | undefined, nuevo: EstadoSemaforo): string {
  return anterior ? `${nombre(anterior)} → ${nombre(nuevo)}` : `Primera evaluación: ${nombre(nuevo)}`;
}

export function formatearEntrada(h: EntradaHistorial, i: number): EntradaLinea {
  return {
    clave: `${h.registradaEn}-${i}`,
    fecha: fechaHora(h.registradaEn),
    anterior: h.estadoAnterior ?? null,
    nuevo: h.estadoNuevo,
    transicion: transicion(h.estadoAnterior, h.estadoNuevo),
    cambioDeColor: !!h.estadoAnterior && h.estadoAnterior !== h.estadoNuevo,
    origen: ETIQUETA_ORIGEN[h.origen] ?? h.origen,
    cuenta: h.cuentaCodigo === "sistema" ? "Sistema (carga de contenido)" : (h.cuentaCodigo ?? ""),
    motivos: (h.motivos ?? []).map((m) => m.texto).filter(Boolean),
    faltantes: h.faltantes ?? [],
    versionReglas: h.versionReglas ?? "",
  };
}

/** Línea de tiempo de solo lectura, de la más reciente a la más antigua. Sin datos: lista vacía. */
export function lineaDeTiempo(entradas: EntradaHistorial[] | null | undefined): EntradaLinea[] {
  return (entradas ?? []).map(formatearEntrada).reverse();
}
