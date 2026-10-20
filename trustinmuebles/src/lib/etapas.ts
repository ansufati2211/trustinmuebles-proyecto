import type { EstadoTecnico } from "./types";

export type EstadoEtapa = "completada" | "actual" | "pendiente";

export const ETAPAS: { clave: EstadoTecnico; etiqueta: string }[] = [
  { clave: "NO_SOLICITADA", etiqueta: "No solicitada" },
  { clave: "SOLICITADA", etiqueta: "Solicitada" },
  { clave: "EN_INSPECCION", etiqueta: "En inspección" },
  { clave: "EMITIDO", etiqueta: "Informe emitido" },
];

/**
 * Las 4 etapas del indicador B con su estado. Las anteriores a la actual están completadas; con el informe emitido el
 * proceso terminó y todas quedan completadas.
 */
export function etapasStepper(estado: EstadoTecnico): { clave: EstadoTecnico; etiqueta: string; estado: EstadoEtapa }[] {
  const actual = ETAPAS.findIndex((e) => e.clave === estado);
  return ETAPAS.map((e, i) => ({
    ...e,
    estado: i < actual || estado === "EMITIDO" ? "completada" : i === actual ? "actual" : "pendiente",
  }));
}

export type EstadoPaso = "hecho" | "en-curso" | "pendiente";

/**
 * Avance de los 6 pasos de la inspección según el estado. Supuesto: «en inspección» significa que la revisión
 * documental y la de planos ya se hicieron y la visita está en curso. Antes de la visita, los pasos solo muestran el
 * alcance del servicio.
 */
export function pasosInspeccion(estado: EstadoTecnico, total = 6): EstadoPaso[] {
  if (estado === "EMITIDO") return Array(total).fill("hecho");
  if (estado === "EN_INSPECCION") return Array.from({ length: total }, (_, i) => (i < 2 ? "hecho" : i === 2 ? "en-curso" : "pendiente"));
  return Array(total).fill("pendiente");
}
