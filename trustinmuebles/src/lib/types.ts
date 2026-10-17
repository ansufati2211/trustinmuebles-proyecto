// DTOs que devuelve el backend (trustinmuebles-backend). Todo el contenido es sintético.

export type Rol = "COMPRADOR" | "REVISOR";
export type EstadoSemaforo = "VERDE" | "AMARILLO" | "ROJO" | "GRIS";
export type EstadoAnotacion = "VIGENTE" | "CANCELADA" | "DESCONOCIDO";
export type Completitud = "COMPLETA" | "INCOMPLETA" | "DESCONOCIDA";
export type EstadoItem = "PENDIENTE" | "REVISADO" | "OBSERVADO";

export interface Usuario { id: number; codigoCuenta: string; rol: Rol }
export interface Sesion { token: string; usuario: Usuario }

export interface ResumenCaso {
  codigo: string; contexto: string; estado: EstadoSemaforo | null; etiqueta: string | null; pendientes: number;
}

export interface Anotacion { referencia: string; estado: EstadoAnotacion; descripcion: string | null }

export interface Expediente {
  version: number; condicionRepresentada: string; titularidad: string; completitud: Completitud;
  fechaReferencial: string; nota: string | null; tieneDocumento: boolean; anotaciones: Anotacion[];
}

export interface Motivo { tipo: "FALTANTE" | "ALERTA" | "CONDICION" | "LIMITE"; texto: string }
export interface Alerta {
  regla: string; prioridad: "PRIORITARIA" | "REVISION"; titulo: string; explicacion: string;
  referencia: string; descripcion: string | null;
}

export interface Evaluacion {
  estado: EstadoSemaforo; etiqueta: string; motivos: Motivo[]; faltantes: string[]; alertas: Alerta[];
  noDescartaOtras: boolean; versionReglas: string; reglasAplicadas: string[]; limite: string;
  calculadaEn: string; expedienteVersion: number;
}

export interface ItemChecklist { id: number; nombre: string; estado: EstadoItem; observacion: string | null }
export interface Termino { concepto: string; explicacion: string; version: string; estadoRevision: string }

export interface DetalleCaso {
  codigo: string; contexto: string; sintetico: boolean; expediente: Expediente;
  evaluacion: Evaluacion | null; checklist: ItemChecklist[]; terminos: Termino[];
}

export interface PeticionExpediente {
  condicionRepresentada: string; titularidad: string; completitud: Completitud; fechaReferencial: string;
  nota: string | null; anotaciones: { referencia: string; estado: EstadoAnotacion; descripcion: string | null }[];
  versionEsperada: number;
}
