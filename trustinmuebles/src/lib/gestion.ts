import { Briefcase, BriefcaseBusiness, ClipboardList, FileQuestion, type LucideIcon } from "lucide-react";
import type { DecisionCaptacion, DecisionCaptacionTipo, EstadoGestion, MotivoDecision, Rol } from "./types";

export const AVISO_GESTION = "Uso interno de la inmobiliaria; no se muestra al comprador ni es una recomendación de compra";

export const ESTADOS_GESTION: EstadoGestion[] = ["VIABLE", "VIABLE_CON_CONDICIONES", "REQUIERE_REGULARIZACION", "COMPLETAR_INFORMACION"];

/**
 * Semáforo de gestión (I15). Íconos de maletín y portapapeles, distintos de los del indicador A, y estilo de contorno sin
 * fondo para que no se confunda con el color documental. Siempre con texto.
 */
export const GESTION: Record<EstadoGestion, { etiqueta: string; Icono: LucideIcon; contorno: string }> = {
  VIABLE: { etiqueta: "Viable", Icono: Briefcase, contorno: "border-sem-verde text-sem-verde-tinta" },
  VIABLE_CON_CONDICIONES: { etiqueta: "Viable con condiciones", Icono: BriefcaseBusiness, contorno: "border-sem-amarillo text-sem-amarillo-tinta" },
  REQUIERE_REGULARIZACION: { etiqueta: "Requiere regularización", Icono: ClipboardList, contorno: "border-sem-rojo text-sem-rojo-tinta" },
  COMPLETAR_INFORMACION: { etiqueta: "Completar información", Icono: FileQuestion, contorno: "border-sem-gris text-sem-gris-tinta" },
};

export const ETIQUETA_DECISION: Record<DecisionCaptacionTipo, string> = {
  CAPTAR: "Captar", CAPTAR_CON_CONDICIONES: "Captar con condiciones", NO_CAPTAR_POR_AHORA: "No captar por ahora",
};

export const ETIQUETA_MOTIVO_DECISION: Record<MotivoDecision, string> = {
  DOCUMENTACION_COMPLETA: "Documentación completa",
  REGULARIZACION_EN_CURSO: "Regularización en curso",
  CARGA_VIGENTE: "Carga vigente",
  PROCESO_JUDICIAL: "Proceso judicial",
  INFORMACION_INSUFICIENTE: "Información insuficiente",
  OTRO_MOTIVO_COMERCIAL: "Otro motivo comercial",
};

/** I15: solo el gestor y el revisor ven el semáforo de gestión; solo el gestor registra decisiones. */
export const puedeVerGestion = (rol: Rol | undefined) => rol === "GESTOR" || rol === "REVISOR";

export const CONFIRMAR_PUBLICAR = "La decisión registrada es no captar por ahora. ¿Publicar de todos modos?";

/**
 * La decisión no bloquea publicar (I15): si la última es «no captar por ahora», la interfaz pide confirmación. Devuelve el
 * texto de la confirmación o null si no hace falta.
 */
export function confirmacionAlPublicar(decisiones: DecisionCaptacion[] | null | undefined): string | null {
  const ultima = decisiones && decisiones.length > 0 ? decisiones[decisiones.length - 1] : null;
  return ultima?.decision === "NO_CAPTAR_POR_AHORA" ? CONFIRMAR_PUBLICAR : null;
}
