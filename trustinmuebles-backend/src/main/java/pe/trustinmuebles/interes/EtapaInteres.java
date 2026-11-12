package pe.trustinmuebles.interes;

/** v1.0 (etapa 4): etapa comercial del interesado, de la primera consulta a la venta o el descarte. */
public enum EtapaInteres {
    NUEVO("Nuevo"),
    CONTACTADO("Contactado"),
    CITA_AGENDADA("Cita agendada"),
    VISITA_REALIZADA("Visita realizada"),
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
