import { AlertTriangle, CheckCircle2, CircleHelp, Clock, Eye, ShieldAlert, type LucideIcon } from "lucide-react";
import type {
  Completitud, Especialidad, EstadoAnotacion, EstadoItem, EstadoPlano, EstadoSemaforo, EstadoTecnico,
  ResultadoTecnico, SistemaConstructivo, TipoActo, TipoPredio, VerificacionCampo,
} from "./types";

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


export const ETIQUETA_PREDIO: Record<TipoPredio, string> = { LOTE: "Lote", VIVIENDA: "Vivienda" };

export const ESPECIALIDADES: Especialidad[] = ["ARQUITECTURA", "ESTRUCTURAS", "ELECTRICAS", "SANITARIAS"];

export const ETIQUETA_ESPECIALIDAD: Record<Especialidad, string> = {
  ARQUITECTURA: "Plano arquitectónico",
  ESTRUCTURAS: "Plano de estructuras",
  ELECTRICAS: "Plano de instalaciones eléctricas (II.EE.)",
  SANITARIAS: "Plano de instalaciones sanitarias (II.SS.)",
};

/** Qué mira el sistema en cada plano. Es una comprobación documental, no del estado de la obra. */
export const QUE_VALIDA: Record<Especialidad, string> = {
  ARQUITECTURA: "Si existe la distribución en 2D y si su área coincide con el área construida inscrita en la partida.",
  ESTRUCTURAS: "Si existe y qué sistema constructivo declara (por ejemplo, albañilería confinada).",
  ELECTRICAS: "Si existe el plano de circuitos, tablero y pozo a tierra.",
  SANITARIAS: "Si existe el plano de redes de agua y desagüe.",
};

export const ETIQUETA_ESTADO_PLANO: Record<EstadoPlano, string> = {
  PRESENTADO: "Presentado", OBSERVADO: "Observado", NO_PRESENTADO: "No presentado", NO_APLICA: "No aplica",
};

export const ETIQUETA_SISTEMA: Record<SistemaConstructivo, string> = {
  ALBANILERIA_CONFINADA: "Albañilería confinada", APORTICADO: "Concreto armado (aporticado)",
  ADOBE: "Adobe o tapial", OTRO: "Otro sistema",
};

export const ETIQUETA_ESTADO_TECNICO: Record<EstadoTecnico, string> = {
  NO_SOLICITADA: "No solicitada", SOLICITADA: "Solicitada", EN_INSPECCION: "En inspección", EMITIDO: "Informe emitido",
};

export const ETIQUETA_RESULTADO: Record<ResultadoTecnico, string> = {
  FAVORABLE: "Favorable", CON_OBSERVACIONES: "Con observaciones subsanables", CON_RIESGO: "Con riesgo estructural o de instalaciones",
};

export const ETIQUETA_VERIFICACION: Record<VerificacionCampo, string> = {
  CONFORME: "Conforme", OBSERVADO: "Observado", NO_VERIFICADO: "No verificado",
};

/** Procedimiento estandarizado de la inspección técnica presencial (EXP2, punto 5). */
export const PROCEDIMIENTO_INSPECCION: { titulo: string; texto: string }[] = [
  { titulo: "Revisión documental previa", texto: "Contrasta la partida registral, la declaratoria de fábrica y los antecedentes del predio." },
  { titulo: "Verificación de los planos (4 especialidades)", texto: "Compara los planos arquitectónico, de estructuras, eléctrico y sanitario con lo construido." },
  { titulo: "Inspección física presencial", texto: "Verificación visual e instrumental en el inmueble: muros y columnas, fisuras, humedad y filtraciones, cableado, tomacorrientes, llave diferencial y pozo a tierra." },
  { titulo: "Observaciones, deficiencias y riesgos", texto: "Registra lo que se encontró en la obra y no figuraba en los planos." },
  { titulo: "Informe técnico", texto: "El profesional colegiado (CIP o CAP) deja constancia de lo verificado, con su número de colegiatura." },
  { titulo: "Alcance y estudios adicionales", texto: "Indica qué conclusiones quedan sustentadas por la inspección y qué requiere ensayos, por ejemplo una diamantina, un estudio de suelos o una medición de aislamiento eléctrico." },
];
