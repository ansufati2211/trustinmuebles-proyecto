package pe.trustinmuebles.clasificacion;

/**
 * Qué provocó un recálculo del indicador A. Lista cerrada: el color solo cambia cuando el motor recalcula por un cambio
 * de datos o documentos (I8); publicar, autorizar, contactar o asignar no son orígenes posibles.
 */
public enum OrigenEvaluacion {
    /** El revisor editó datos del expediente que no son asientos ni planos (o subió el PDF del caso). */
    EDICION,
    /** El revisor incorporó o cambió un plano, o subió el PDF de un plano. */
    PLANO_ADJUNTO,
    /** El revisor registró una partida transcrita o incorporó asientos nuevos de la partida. */
    PARTIDA_TRANSCRITA,
    /** El revisor registró una partida simulada o incorporó asientos nuevos a una partida simulada captada. */
    PARTIDA_SIMULADA,
    /** Carga de contenido al arrancar (primera evaluación o cambio de versión de reglas). */
    CARGA_INICIAL
}
