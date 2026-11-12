package pe.trustinmuebles.identidad;

/**
 * Solo el revisor modifica expedientes y checklist (RN-07, PA4). El comprador consulta y solicita la inspección. Solo el
 * especialista emite el informe técnico presencial. El gestor (asesor comercial) publica y atiende la cartera. El
 * propietario solo consulta sus casos y otorga o retira su autorización (I13).
 * <p>
 * v1.0: el ASESOR de la inmobiliaria reúne los permisos del REVISOR y del GESTOR (registra, subsana, publica, atiende y
 * asigna). No autoriza por un particular ni emite el informe técnico.
 */
public enum Rol {
    COMPRADOR, REVISOR, ESPECIALISTA, GESTOR, PROPIETARIO, ASESOR;

    /** ¿Este rol tiene los permisos de {@code otro}? El asesor tiene los del revisor y los del gestor. */
    public boolean incluye(Rol otro) {
        return this == otro || (this == ASESOR && (otro == REVISOR || otro == GESTOR));
    }
}
