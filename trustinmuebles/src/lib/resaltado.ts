import type { LucideIcon } from "lucide-react";
import { CircleHelp } from "lucide-react";
import { ESTADOS } from "./semaforo";
import type { EstadoSemaforo } from "./types";

export interface Resaltado {
  /** Borde izquierdo de 4 px y fondo tenue (≈7 %) del contenedor. */
  contenedor: string;
  /** Color del texto de la etiqueta. */
  texto: string;
  /** Etiqueta del estado: siempre acompaña al color (nunca solo color). */
  etiqueta: string;
  Icono: LucideIcon;
}

const CLASES: Record<EstadoSemaforo, { contenedor: string; texto: string }> = {
  VERDE: { contenedor: "border-l-4 border-l-resaltado-verde-borde bg-resaltado-verde-fondo", texto: "text-resaltado-verde-texto" },
  AMARILLO: { contenedor: "border-l-4 border-l-resaltado-amarillo-borde bg-resaltado-amarillo-fondo", texto: "text-resaltado-amarillo-texto" },
  ROJO: { contenedor: "border-l-4 border-l-resaltado-rojo-borde bg-resaltado-rojo-fondo", texto: "text-resaltado-rojo-texto" },
  GRIS: { contenedor: "border-l-4 border-l-resaltado-gris-borde bg-resaltado-gris-fondo", texto: "text-resaltado-gris-texto" },
};

/**
 * v0.8 (B6): clases del resaltado del indicador A para tarjetas, listas y la cabecera del detalle. Función pura. Un caso
 * sin evaluación se muestra como gris con «Sin evaluar».
 */
export function resaltadoA(estado: EstadoSemaforo | null | undefined): Resaltado {
  if (!estado) return { ...CLASES.GRIS, etiqueta: "Sin evaluar", Icono: CircleHelp };
  return { ...CLASES[estado], etiqueta: ESTADOS[estado].resumen, Icono: ESTADOS[estado].Icono };
}
