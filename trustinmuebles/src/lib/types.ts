// DTOs que devuelve el backend (trustinmuebles-backend).

export type Rol = "COMPRADOR" | "REVISOR" | "ESPECIALISTA";
export type TipoPredio = "LOTE" | "VIVIENDA";
/** Tipo que ve el comprador en el catálogo. El backend lo deriva del tipo de predio. */
export type TipoInmueble = "VIVIENDA_URBANA" | "LOTE_URBANO";
export type Especialidad = "ARQUITECTURA" | "ESTRUCTURAS" | "ELECTRICAS" | "SANITARIAS";
export type EstadoPlano = "PRESENTADO" | "OBSERVADO" | "NO_PRESENTADO" | "NO_APLICA";
export type SistemaConstructivo = "ALBANILERIA_CONFINADA" | "APORTICADO" | "ADOBE" | "OTRO";
export type EstadoTecnico = "NO_SOLICITADA" | "SOLICITADA" | "EN_INSPECCION" | "EMITIDO";
export type ResultadoTecnico = "FAVORABLE" | "CON_OBSERVACIONES" | "CON_RIESGO";
export type VerificacionCampo = "CONFORME" | "OBSERVADO" | "NO_VERIFICADO";
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

/** Datos del predio para el catálogo. El precio es referencial e informativo (en soles) y no interviene en el semáforo. */
export interface Predio {
  tipoInmueble: TipoInmueble; tipoInmuebleEtiqueta: string; distrito: string | null; areaM2: number | null;
  areaConstruidaInscrita: number | null; precioReferencial: number | null; moneda: string | null; precioNota: string | null;
}

export interface ResumenCaso {
  codigo: string; denominacion: string; contexto: string; estado: EstadoSemaforo | null; etiqueta: string | null;
  pendientes: number; origen: Origen; fuente: string | null; fechaConsulta: string | null; estadoTecnico: EstadoTecnico;
  resultadoTecnico: ResultadoTecnico | null; riesgoFisicoDetectado: boolean; predio: Predio;
}

/** Condiciones del servicio de inspección. El costo lo fija el backend (configuración), no la interfaz. */
export interface ServicioInspeccion { costoReferencial: number; moneda: string; condiciones: string }

/** Un plano del expediente técnico. coincideArea solo se calcula en el plano arquitectónico. */
export interface Plano {
  especialidad: Especialidad; especialidadEtiqueta: string; estado: EstadoPlano; areaConstruida: number | null;
  sistemaConstructivo: SistemaConstructivo | null; sistemaConstructivoEtiqueta: string | null;
  observacion: string | null; tieneDocumentoPropio: boolean; coincideArea: boolean | null;
}

/** Indicador B: lo que se sabe de la verificación física. Independiente del semáforo documental. */
export interface EvaluacionTecnica {
  estado: EstadoTecnico; estadoEtiqueta: string; resultado: ResultadoTecnico | null; resultadoEtiqueta: string | null;
  profesional: string | null; colegiatura: string | null; fechaSolicitud: string | null; fechaInspeccion: string | null;
  verifArquitectura: VerificacionCampo | null; verifEstructuras: VerificacionCampo | null;
  verifElectricas: VerificacionCampo | null; verifSanitarias: VerificacionCampo | null;
  observaciones: string | null; conclusiones: string | null; estudiosAdicionales: string | null; limite: string;
  /** Especialidad del profesional; como el nombre y la colegiatura, la pone el servidor desde su cuenta (M8). */
  profesionalEspecialidad: string | null;
  /** Cuenta que pidió la inspección, tomada de la sesión (M5). */
  solicitanteCodigo: string | null;
  riesgoFisicoDetectado: boolean;
  servicio: ServicioInspeccion | null;
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
  tipoPredio: TipoPredio; areaConstruidaInscrita: number | null; planos: Plano[];
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
  evaluacion: Evaluacion | null; evaluacionTecnica: EvaluacionTecnica; checklist: ItemChecklist[]; terminos: Termino[];
  predio: Predio;
}

export interface AsientoPeticion {
  referencia: string; tipoActo: TipoActo; estado: EstadoAnotacion | null; fechaInscripcion: string | null;
  tituloNumero: string | null; fechaPresentacion: string | null; texto: string | null; canceloNumero: string | null;
  titulares: string | null;
}

export interface PlanoPeticion {
  especialidad: Especialidad; estado: EstadoPlano; areaConstruida: number | null;
  sistemaConstructivo: SistemaConstructivo | null; observacion: string | null;
}

export interface PeticionExpediente {
  condicionRepresentada: string; completitud: Completitud; fechaReferencial: string; nota: string | null;
  zonaRegistral: string | null; oficinaRegistral: string | null; ubicacion: string | null; areaM2: number | null;
  linderos: string | null; antecedenteDominial: string | null; asientos: AsientoPeticion[];
  tipoPredio: TipoPredio; areaConstruidaInscrita: number | null; planos: PlanoPeticion[]; versionEsperada: number;
}
