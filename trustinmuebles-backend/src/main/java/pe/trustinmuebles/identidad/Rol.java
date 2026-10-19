package pe.trustinmuebles.identidad;

/**
 * Solo el revisor modifica expedientes y checklist (RN-07, PA4). El comprador consulta y solicita la inspección. Solo el
 * especialista emite el informe técnico presencial.
 */
public enum Rol {
    COMPRADOR, REVISOR, ESPECIALISTA
}
