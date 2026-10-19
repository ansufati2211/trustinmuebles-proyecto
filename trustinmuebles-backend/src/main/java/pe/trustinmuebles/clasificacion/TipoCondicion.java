package pe.trustinmuebles.clasificacion;

/** Tipos de condición que el motor sabe evaluar. Agregar uno exige revisión de contenido. */
enum TipoCondicion {
    ANOTACION_VIGENTE,
    /** Falta un plano de instalaciones (II.EE. o II.SS.) en una vivienda. */
    PLANO_NO_PRESENTADO,
    /** El área del plano arquitectónico no coincide con el área construida inscrita. */
    DISCREPANCIA_AREA,
    /** El revisor observó algún plano. */
    PLANO_OBSERVADO
}
