import { AlertTriangle, CheckCircle2, CircleHelp, Clock, Eye, ShieldAlert, type LucideIcon } from "lucide-react";
import type { Completitud, EstadoAnotacion, EstadoItem, EstadoSemaforo, TipoActo } from "./types";

export type Tono = "success" | "warning" | "danger" | "pending";

/** Cada estado se comunica con texto, color e ícono: nunca solo con color (REQ-NF01). */
export const ESTADOS: Record<EstadoSemaforo, {
  nombre: string; resumen: string; tono: Tono; Icono: LucideIcon;
  texto: string; fondo: string; borde: string; banda: string;
}> = {
  VERDE: {
    nombre: "Verde", resumen: "Sin alertas detectadas en los campos evaluados", tono: "success", Icono: CheckCircle2,
    texto: "text-[#15803D]", fondo: "bg-success/10", borde: "border-success/30", banda: "bg-success",
  },
  AMARILLO: {
    nombre: "Amarillo", resumen: "Requiere revisión", tono: "warning", Icono: AlertTriangle,
    texto: "text-[#B45309]", fondo: "bg-warning/10", borde: "border-warning/40", banda: "bg-warning",
  },
  ROJO: {
    nombre: "Rojo", resumen: "Alerta prioritaria", tono: "danger", Icono: ShieldAlert,
    texto: "text-[#B91C1C]", fondo: "bg-danger/10", borde: "border-danger/30", banda: "bg-danger",
  },
  GRIS: {
    nombre: "Gris", resumen: "Información insuficiente o condición no evaluable", tono: "pending", Icono: CircleHelp,
    texto: "text-muted-foreground", fondo: "bg-gray-100", borde: "border-gray-300", banda: "bg-gray-400",
  },
};

export const ETIQUETA_ANOTACION: Record<EstadoAnotacion, string> = {
  VIGENTE: "Vigente", CANCELADA: "Cancelada", DESCONOCIDO: "Desconocido",
};

/** Rubros de la partida que se editan como asientos. Las letras A y B del informe no se usan: ver docs/decisiones.md. */
export const RUBROS: Record<string, string> = {
  C: "Títulos de dominio",
  D: "Gravámenes y cargas",
  E: "Cancelaciones",
  F: "Otros",
};

export const ETIQUETA_ACTO: Record<TipoActo, string> = {
  PRIMERA_INSCRIPCION: "Primera inscripción",
  INDEPENDIZACION: "Independización",
  COMPRAVENTA: "Compraventa",
  SUCESION: "Sucesión",
  HIPOTECA: "Hipoteca",
  EMBARGO: "Embargo",
  ANOTACION_DEMANDA: "Anotación de demanda",
  MEDIDA_CAUTELAR: "Medida cautelar",
  BLOQUEO: "Bloqueo registral",
  CARGA_TECNICA: "Carga técnica",
  SERVIDUMBRE: "Servidumbre",
  CANCELACION: "Cancelación",
  OTRO: "Otro acto",
};

export const ETIQUETA_COMPLETITUD: Record<Completitud, string> = {
  COMPLETA: "Completa", INCOMPLETA: "Incompleta", DESCONOCIDA: "Desconocida",
};

export const ITEM: Record<EstadoItem, { etiqueta: string; Icono: LucideIcon; texto: string }> = {
  PENDIENTE: { etiqueta: "Pendiente", Icono: Clock, texto: "text-muted-foreground" },
  REVISADO: { etiqueta: "Revisado", Icono: CheckCircle2, texto: "text-[#15803D]" },
  OBSERVADO: { etiqueta: "Observado", Icono: Eye, texto: "text-[#B45309]" },
};

export const fecha = (iso: string | null | undefined) =>
  iso ? new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) : "";
