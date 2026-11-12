// DTOs que devuelve el backend (trustinmuebles-backend).

export type Rol = "COMPRADOR" | "REVISOR" | "ESPECIALISTA" | "GESTOR" | "PROPIETARIO" | "ASESOR";
/**
 * v1.0: quién comercializa el inmueble. INMOBILIARIA: la autorización la registran el asesor o el gestor en su nombre.
 * PARTICULAR: solo su propietario autoriza.
 */
export type TitularidadComercial = "INMOBILIARIA" | "PARTICULAR";
/** Estado comercial del caso (v0.7). Es independiente del color del indicador A. */
export type EstadoPublicacion = "BORRADOR" | "PUBLICADO" | "RETIRADO";
export type TipoPredio = "LOTE" | "VIVIENDA";
/** Tipo que ve el comprador en el catálogo. El backend lo deriva del tipo de predio. */
export type TipoInmueble = "VIVIENDA_URBANA" | "LOTE_URBANO";
export type Especialidad = "ARQUITECTURA" | "ESTRUCTURAS" | "ELECTRICAS" | "SANITARIAS";
export type EstadoPlano = "PRESENTADO" | "OBSERVADO" | "NO_PRESENTADO" | "NO_APLICA";
/** v0.9: documentos del expediente de un lote. */
export type DocumentoLoteTipo = "PLANO_PERIMETRICO" | "MEMORIA_DESCRIPTIVA" | "CERTIFICADO_ZONIFICACION" | "TASACION";
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

/**
 * Datos del predio para el catálogo. El precio es referencial e informativo y no interviene en el semáforo. moneda es
 * PEN o, v0.9, USD (precio base de una subasta de la SBN).
 */
export interface Predio {
  tipoInmueble: TipoInmueble; tipoInmuebleEtiqueta: string; distrito: string | null; areaM2: number | null;
  areaConstruidaInscrita: number | null; precioReferencial: number | null; moneda: string | null; precioNota: string | null;
  /** v1.0 (etapa 2): precio referencial entre el área del terreno; null si falta alguno. Informativo. */
  precioPorM2?: number | null;
  /** v1.0 (etapa 2): proyecto o urbanización; null si el inmueble no es de uno. */
  proyecto?: string | null;
  estadoComercial?: EstadoComercial; estadoComercialEtiqueta?: string;
  /** v1.0 (etapa 2): independización del lote, con su etiqueta y una línea de explicación. No cambia el indicador A. */
  independizacion?: Independizacion; independizacionEtiqueta?: string; independizacionExplicacion?: string;
}

export type EstadoComercial = "DISPONIBLE" | "SEPARADO" | "VENDIDO";
export type Independizacion = "PARTIDA_PROPIA" | "EN_PARTIDA_MATRIZ" | "NO_CONSTA";

/** v1.0 (etapa 2): valores de los selectores de filtro del catálogo público (GET /publico/filtros). */
export interface OpcionesFiltro { proyectos: string[]; distritos: string[]; tiposAlerta: TipoAlerta[] }

export interface ResumenCaso {
  codigo: string; denominacion: string; contexto: string; estado: EstadoSemaforo | null; etiqueta: string | null;
  pendientes: number; origen: Origen; fuente: string | null; fechaConsulta: string | null; estadoTecnico: EstadoTecnico;
  /** v0.9: enlace a la publicación oficial (por ejemplo, la subasta de la SBN). */
  fuenteUrl?: string | null;
  resultadoTecnico: ResultadoTecnico | null; riesgoFisicoDetectado: boolean; predio: Predio;
  estadoPublicacion: EstadoPublicacion;
  /** v0.8: códigos de las reglas aplicadas y, si el caso es gris, INFORMACION_INSUFICIENTE. */
  tiposAlerta?: string[];
  /** v0.8 (I15): solo para gestor y revisor; para los demás el campo no viene. */
  gestion?: GestionInmobiliaria;
  /** v1.0 */
  titularidadComercial?: TitularidadComercial;
}

/**
 * v1.0: un inmueble del catálogo público (GET /publico/inmuebles). Es lo que ve el comprador: sin semáforo de gestión,
 * decisiones de captación ni código del propietario.
 */
export interface InmueblePublico {
  codigo: string; denominacion: string; contexto: string; estado: EstadoSemaforo | null; etiqueta: string | null;
  origen: Origen; fuente: string | null; fechaConsulta: string | null; fuenteUrl?: string | null;
  estadoTecnico: EstadoTecnico; resultadoTecnico: ResultadoTecnico | null; riesgoFisicoDetectado: boolean;
  predio: Predio; tiposAlerta?: string[]; titularidadComercial?: TitularidadComercial;
}

/** v1.0: una página del catálogo público (la primera es la 0; 24 por página). */
export interface PaginaPublica {
  items: InmueblePublico[]; pagina: number; tamano: number; total: number; totalPaginas: number;
}

/** v1.0: una fila del historial de autorizaciones (GET /casos/{codigo}/autorizaciones). */
export interface RegistroAutorizacion {
  accion: "OTORGADA" | "RETIRADA"; enNombreDe: TitularidadComercial; cuentaCodigo: string; registradaEn: string;
}

/** v0.8: un tipo de alerta (GET /casos/tipos-alerta): código y nombre de la regla, o información insuficiente. */
export interface TipoAlerta { codigo: string; nombre: string }

/** Captación y publicación (v0.7). El comprador recibe propietarioCodigo en null (I11). */
export interface Publicacion {
  estado: EstadoPublicacion; propietarioCodigo: string | null; autorizada: boolean; autorizacionFecha: string | null;
  /** v1.0: si no viene, se trata como PARTICULAR. */
  titularidadComercial?: TitularidadComercial;
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

/** v0.9: un documento del lote. Siempre vienen los cuatro; el que no se registró llega como no presentado. */
export interface DocumentoLote {
  tipo: DocumentoLoteTipo; tipoEtiqueta: string; estado: EstadoPlano; observacion: string | null;
  resumen: string | null; tieneDocumentoPropio: boolean; documento?: DocumentoInfo | null;
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
  /** v0.9: vacío si el predio no es un lote. */
  documentosLote?: DocumentoLote[];
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
  fuente: string | null; fechaConsulta: string | null; fuenteUrl?: string | null; expediente: Expediente;
  evaluacion: Evaluacion | null; evaluacionTecnica: EvaluacionTecnica; checklist: ItemChecklist[]; terminos: Termino[];
  predio: Predio; publicacion: Publicacion;
  /** v0.8 (I15): solo para gestor y revisor. */
  gestion?: GestionInmobiliaria;
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
  porRegularizar?: {
    codigo: string; denominacion: string; color: EstadoSemaforo | null; tiposAlerta: string[]; esfuerzo: Esfuerzo;
    estadoGestion?: EstadoGestion;
  }[];
  avisoPriorizacion?: string;
  /** v0.8 (D54): conteo por estado de gestión y matriz tipo de alerta × estado de gestión. */
  porEstadoGestion?: Partial<Record<EstadoGestion, number>>;
  matrizGestion?: { codigo: string; nombre: string; porEstadoGestion: Partial<Record<EstadoGestion, number>> }[];
  avisoGestion?: string;
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

export interface DocumentoLotePeticion { tipo: DocumentoLoteTipo; estado: EstadoPlano; observacion: string | null }

export interface PeticionExpediente {
  condicionRepresentada: string; completitud: Completitud; fechaReferencial: string; nota: string | null;
  zonaRegistral: string | null; oficinaRegistral: string | null; ubicacion: string | null; areaM2: number | null;
  linderos: string | null; antecedenteDominial: string | null; asientos: AsientoPeticion[];
  tipoPredio: TipoPredio; areaConstruidaInscrita: number | null; planos: PlanoPeticion[];
  /** v0.9: documentos del lote; si no viene, el servidor los deja como estaban. */
  documentosLote?: DocumentoLotePeticion[];
  versionEsperada: number;
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

/** v0.8 (I15): semáforo de gestión, interno de la inmobiliaria. Solo llega al gestor y al revisor. */
export type EstadoGestion = "VIABLE" | "VIABLE_CON_CONDICIONES" | "REQUIERE_REGULARIZACION" | "COMPLETAR_INFORMACION";

export interface GestionInmobiliaria {
  estado: EstadoGestion; etiqueta: string; explicacion: string; sugerencia: string; esfuerzo: Esfuerzo | null; aviso: string;
}

export type DecisionCaptacionTipo = "CAPTAR" | "CAPTAR_CON_CONDICIONES" | "NO_CAPTAR_POR_AHORA";
export type MotivoDecision =
  | "DOCUMENTACION_COMPLETA" | "REGULARIZACION_EN_CURSO" | "CARGA_VIGENTE" | "PROCESO_JUDICIAL"
  | "INFORMACION_INSUFICIENTE" | "OTRO_MOTIVO_COMERCIAL";

/** Una decisión de captación (historial de solo adición). Sin texto libre (I11). */
export interface DecisionCaptacion {
  id: number; casoCodigo: string; decision: DecisionCaptacionTipo; decisionEtiqueta: string; motivo: MotivoDecision;
  motivoEtiqueta: string; cuentaCodigo: string; registradaEn: string;
}
