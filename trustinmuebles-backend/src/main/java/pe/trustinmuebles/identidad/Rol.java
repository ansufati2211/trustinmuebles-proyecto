package pe.trustinmuebles.identidad;

/**
 * Solo el revisor modifica expedientes y checklist (RN-07, PA4). El comprador consulta y solicita la inspección. Solo el
 * especialista emite el informe técnico presencial. El gestor (asesor comercial) publica y atiende la cartera. El
 * propietario solo consulta sus casos y otorga o retira su autorización (I13).
 */
public enum Rol {
    COMPRADOR, REVISOR, ESPECIALISTA, GESTOR, PROPIETARIO
}
