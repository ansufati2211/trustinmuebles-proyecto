// DTOs que devuelve el backend (trustinmuebles-backend).

export type Rol = "COMPRADOR" | "REVISOR" | "ESPECIALISTA" | "GESTOR" | "PROPIETARIO";
/** Estado comercial del caso (v0.7). Es independiente del color del indicador A. */
export type EstadoPublicacion = "BORRADOR" | "PUBLICADO" | "RETIRADO";
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
/** Origen que el revisor elige al captar una partida (ETP-1). */
export type OrigenCaptacion = "TRANSCRITA_CONOCE_AQUI" | "SIMULADA_DEMOSTRACION";
export type Completitud = "COMPLETA" | "INCOMPLETA" | "DESCONOCIDA";
export type EstadoItem = "PENDIENTE" | "REVISADO" | "OBSERVADO";
export type TipoActo =
  | "PRIMERA_INSCRIPCION" | "INDEPENDIZACION" | "COMPRAVENTA" | "SUCESION" | "HIPOTECA" | "EMBARGO"
  | "ANOTACION_DEMANDA" | "MEDIDA_CAUTELAR" | "BLOQUEO" | "CARGA_TECNICA" | "SERVIDUMBRE" | "CANCELACION" | "OTRO";

/** funcion: por ejemplo «Asesor comercial» en la cuenta del gestor (v0.7); null en las demás. */
export interface Usuario { id: number; codigoCuenta: string; rol: Rol; funcion?: string | null }
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
  estadoPublicacion: EstadoPublicacion;
  /** v0.8: códigos de las reglas aplicadas y, si el caso es gris, INFORMACION_INSUFICIENTE. */
  tiposAlerta?: string[];
}

/** v0.8: un tipo de alerta (GET /casos/tipos-alerta): código y nombre de la regla, o información insuficiente. */
export interface TipoAlerta { codigo: string; nombre: string }

/** Captación y publicación (v0.7). El comprador recibe propietarioCodigo en null (I11). */
export interface Publicacion {
  estado: EstadoPublicacion; propietarioCodigo: string | null; autorizada: boolean; autorizacionFecha: string | null;
}

/** Condiciones del servicio de inspección. El costo lo fija el backend (configuración), no la interfaz. */
export interface ServicioInspeccion { costoReferencial: number; moneda: string; condiciones: string }

/** Un plano del expediente técnico. coincideArea solo se calcula en el plano arquitectónico. */
export interface Plano {
  especialidad: Especialidad; especialidadEtiqueta: string; estado: EstadoPlano; areaConstruida: number | null;
  sistemaConstructivo: SistemaConstructivo | null; sistemaConstructivoEtiqueta: string | null;
  observacion: string | null; tieneDocumentoPropio: boolean; coincideArea: boolean | null;
  /** v0.8: origen del PDF del plano; null si el plano no está presentado ni observado. */
  documento?: DocumentoInfo | null;
}

/**
 * v0.8: de dónde sale un PDF. SUBIDO lleva su evidencia (cuenta, fecha, tamaño, huella); GENERADO es la lámina o copia
 * que arma el sistema (no es un documento oficial); FALTA, que no hay archivo.
 */
export interface DocumentoInfo {
  origen: "SUBIDO" | "GENERADO" | "FALTA"; subidoPor: string | null; subidoEn: string | null;
  tamanoBytes: number | null; tamanoOriginalBytes: number | null; optimizado: boolean; sha256: string | null;
}

/** Respuesta de una subida (v0.8). */
export interface DocumentoSubido {
  codigo: string; sha256: string; tamanoOriginalBytes: number; tamanoBytes: number; optimizado: boolean;
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
  /** v0.7: especialista asignado por el gestor. Solo él emite el informe; sin asignación, nadie. */
  especialistaAsignadoCodigo?: string | null;
}

/** Asiento de la partida. La primera letra de la referencia es el rubro: C, D, E o F. */
export interface Asiento {
  referencia: string; rubro: string; tipoActo: TipoActo; tipoActoEtiqueta: string; estado: EstadoAnotacion | null;
  fechaInscripcion: string | null; tituloNumero: string | null; fechaPresentacion: string | null; texto: string | null;
  canceloNumero: string | null; titulares: string | null;
  /** v0.8: solo en el rubro D. Persona jurídica o «no consta»; plazo si consta. No intervienen en el color. */
  acreedor?: string | null; plazoOVencimiento?: string | null;
}

export interface Expediente {
  version: number; condicionRepresentada: string; titularidad: string; completitud: Completitud;
  fechaReferencial: string; nota: string | null; zonaRegistral: string | null; oficinaRegistral: string | null;
  ubicacion: string | null; areaM2: number | null; linderos: string | null; antecedenteDominial: string | null;
  tieneDocumento: boolean; documentoGenerado: boolean; documento?: DocumentoInfo | null; asientos: Asiento[];
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
  predio: Predio; publicacion: Publicacion;
}

/** Qué provocó un recálculo del indicador A (lista cerrada del backend). */
export type OrigenEvaluacion = "EDICION" | "PLANO_ADJUNTO" | "PARTIDA_TRANSCRITA" | "PARTIDA_SIMULADA" | "CARGA_INICIAL";

/** Una fila del historial de evaluaciones (GET /casos/{codigo}/historial). Solo lectura. */
export interface EntradaHistorial {
  registradaEn: string; estadoAnterior: EstadoSemaforo | null; estadoNuevo: EstadoSemaforo; motivos: Motivo[];
  faltantes: string[]; versionReglas: string; origen: OrigenEvaluacion; cuentaCodigo: string;
}

export type MotivoContacto = "INFORMACION_GENERAL" | "CONSULTA_DOCUMENTOS" | "CONSULTA_INSPECCION";
export type EstadoContacto = "PENDIENTE" | "ATENDIDA";

/** Solicitud de contacto: solo códigos de cuenta, fechas y un motivo cerrado (I11). */
export interface Contacto {
  id: number; casoCodigo: string; compradorCodigo: string; motivo: MotivoContacto; estado: EstadoContacto;
  creadaEn: string; atendidaEn: string | null; atendidaPor: string | null;
}

export interface CasoConFaltantes { codigo: string; estado: EstadoSemaforo; faltantes: string[] }
export interface InspeccionEnCurso {
  codigo: string; estado: EstadoTecnico; especialistaAsignadoCodigo: string | null; asignada: boolean;
}

/** Panel de cartera del gestor (GET /cartera/panel). Solo lectura. */
export interface PanelCartera {
  totalCasos: number; porColor: Partial<Record<EstadoSemaforo, number>>;
  porEstadoPublicacion: Partial<Record<EstadoPublicacion, number>>; casosConFaltantes: CasoConFaltantes[];
  inspecciones: InspeccionEnCurso[]; inspeccionesAsignadas: number; inspeccionesSinAsignar: number;
  contactosPendientes: Contacto[];
  /** v0.8 (D52): conteos por tipo de alerta y por esfuerzo, y la lista para organizar la subsanación. */
  porTipoAlerta?: { codigo: string; nombre: string; casos: number }[];
  porEsfuerzo?: Partial<Record<Esfuerzo | "SIN_PASOS", number>>;
  porRegularizar?: { codigo: string; denominacion: string; color: EstadoSemaforo | null; tiposAlerta: string[]; esfuerzo: Esfuerzo }[];
  avisoPriorizacion?: string;
}

export interface AsientoPeticion {
  referencia: string; tipoActo: TipoActo; estado: EstadoAnotacion | null; fechaInscripcion: string | null;
  tituloNumero: string | null; fechaPresentacion: string | null; texto: string | null; canceloNumero: string | null;
  titulares: string | null; acreedor?: string | null; plazoOVencimiento?: string | null;
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

/** v0.8: esfuerzo de regularización (criterio del equipo, borrador). No es un plazo ni un costo. */
export type Esfuerzo = "BAJO" | "MEDIO" | "ALTO";

/** Un paso de la ruta de regularización: uno por motivo de la evaluación vigente. */
export interface ItemRuta {
  tipo: "ALERTA" | "FALTANTE" | "CONDICION"; clave: string; referencia: string | null; titulo: string; pasos: string[];
  gestiona: string; documentoRequerido: string; esfuerzo: Esfuerzo; esfuerzoEtiqueta: string; nota: string | null;
  /** v0.8 (B3): solo en una hipoteca. plazo es el texto listo para mostrar. */
  gravamen?: { acreedor: string; plazoOVencimiento: string | null; plazo: string } | null;
}

/** GET /casos/{codigo}/ruta-regularizacion (v0.8). Orientativa y de solo lectura. */
export interface RutaRegularizacion {
  codigo: string; estado: EstadoSemaforo | null; esfuerzo: Esfuerzo | null; esfuerzoEtiqueta: string | null;
  items: ItemRuta[]; tiposAlerta: string[]; mensaje: string | null; aviso: string; plazoGeneral: string;
  estadoRevision: string; versionContenido: string;
}
