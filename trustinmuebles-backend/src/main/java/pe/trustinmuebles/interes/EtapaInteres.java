package pe.trustinmuebles.interes;

/**
 * v1.0 (etapa 4): etapa comercial del interesado, de la primera consulta a la venta o el descarte. v2.0 (RF36): el
 * seguimiento va contactado → revisado → cita agendada → visita realizada → acuerdo → separación → venta.
 */
public enum EtapaInteres {
    NUEVO("Nuevo"),
    CONTACTADO("Contactado"),
    REVISADO("Revisado"),
    CITA_AGENDADA("Cita agendada"),
    VISITA_REALIZADA("Visita realizada"),
    ACUERDO("Acuerdo"),
    SEPARACION("Separación"),
    VENTA("Venta"),
    DESCARTADO("Descartado");

    private final String etiqueta;

    EtapaInteres(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }

    /** Un interesado cerrado (venta o descarte) ya no tiene acciones vencidas. */
    boolean cerrada() {
        return this == VENTA || this == DESCARTADO;
    }
}
