package pe.trustinmuebles.clasificacion;

/** Tipos de condición que el motor sabe evaluar. Agregar uno exige revisión de contenido. */
enum TipoCondicion {
    ANOTACION_VIGENTE,
    /** Falta un plano de instalaciones (II.EE. o II.SS.) en una vivienda. */
    PLANO_NO_PRESENTADO,
    /** El área del plano arquitectónico no coincide con el área construida inscrita. */
    DISCREPANCIA_AREA,
    /** El revisor observó algún plano de la vivienda o algún documento del lote. */
    PLANO_OBSERVADO,
    /** v0.9: en un lote falta el certificado de zonificación y vías. */
    DOCUMENTO_LOTE_NO_PRESENTADO
}
