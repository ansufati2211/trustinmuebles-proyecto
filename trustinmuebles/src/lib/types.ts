// DTOs que devuelve el backend (trustinmuebles-backend).

export type Rol = "COMPRADOR" | "REVISOR";
export type EstadoSemaforo = "VERDE" | "AMARILLO" | "ROJO" | "GRIS";
export type EstadoAnotacion = "VIGENTE" | "CANCELADA" | "DESCONOCIDO";
/** SINTETICO: partida ficticia con prefijo SIM-. TRANSCRITA: copiada de una consulta pública, sin personas naturales. */
export type Origen = "SINTETICO" | "TRANSCRITA";
export type Completitud = "COMPLETA" | "INCOMPLETA" | "DESCONOCIDA";
export type EstadoItem = "PENDIENTE" | "REVISADO" | "OBSERVADO";
export type TipoActo =
  | "PRIMERA_INSCRIPCION" | "INDEPENDIZACION" | "COMPRAVENTA" | "SUCESION" | "HIPOTECA" | "EMBARGO"
  | "ANOTACION_DEMANDA" | "MEDIDA_CAUTELAR" | "BLOQUEO" | "CARGA_TECNICA" | "SERVIDUMBRE" | "CANCELACION" | "OTRO";

export interface Usuario { id: number; codigoCuenta: string; rol: Rol }
export interface Sesion { token: string; usuario: Usuario }

export interface ResumenCaso {
  codigo: string; denominacion: string; contexto: string; estado: EstadoSemaforo | null; etiqueta: string | null;
  pendientes: number; origen: Origen; fuente: string | null; fechaConsulta: string | null;
}

/** Asiento de la partida. La primera letra de la referencia es el rubro: C, D, E o F. */
export interface Asiento {
  referencia: string; rubro: string; tipoActo: TipoActo; tipoActoEtiqueta: string; estado: EstadoAnotacion | null;
  fechaInscripcion: string | null; tituloNumero: string | null; fechaPresentacion: string | null; texto: string | null;
  canceloNumero: string | null; titulares: string | null;
}

export interface Expediente {
  version: number; condicionRepresentada: string; titularidad: string; completitud: Completitud;
  fechaReferencial: string; nota: string | null; zonaRegistral: string | null; oficinaRegistral: string | null;
  ubicacion: string | null; areaM2: number | null; linderos: string | null; antecedenteDominial: string | null;
  tieneDocumento: boolean; documentoGenerado: boolean; asientos: Asiento[];
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
  codigo: string; denominacion: string; contexto: string; sintetico: boolean; origen: Origen;
  fuente: string | null; fechaConsulta: string | null; expediente: Expediente;
  evaluacion: Evaluacion | null; checklist: ItemChecklist[]; terminos: Termino[];
}

export interface AsientoPeticion {
  referencia: string; tipoActo: TipoActo; estado: EstadoAnotacion | null; fechaInscripcion: string | null;
  tituloNumero: string | null; fechaPresentacion: string | null; texto: string | null; canceloNumero: string | null;
  titulares: string | null;
}

export interface PeticionExpediente {
  condicionRepresentada: string; completitud: Completitud; fechaReferencial: string; nota: string | null;
  zonaRegistral: string | null; oficinaRegistral: string | null; ubicacion: string | null; areaM2: number | null;
  linderos: string | null; antecedenteDominial: string | null; asientos: AsientoPeticion[]; versionEsperada: number;
}
