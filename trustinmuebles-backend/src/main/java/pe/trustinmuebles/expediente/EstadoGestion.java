package pe.trustinmuebles.expediente;

/**
 * Semáforo de gestión (v0.8, decisión 2; I15). Interno de la inmobiliaria: solo lo ven el gestor y el revisor, no cambia
 * los indicadores A ni B y no bloquea la publicación. Se deriva de la ruta de regularización.
 */
public enum EstadoGestion {
    VIABLE, VIABLE_CON_CONDICIONES, REQUIERE_REGULARIZACION, COMPLETAR_INFORMACION
}
