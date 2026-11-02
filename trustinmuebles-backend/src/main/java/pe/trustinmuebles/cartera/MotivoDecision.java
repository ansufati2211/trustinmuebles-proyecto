package pe.trustinmuebles.cartera;

/** v0.8: motivo de una decisión de captación, de lista cerrada y sin texto libre (I11). */
enum MotivoDecision {
    DOCUMENTACION_COMPLETA("Documentación completa"),
    REGULARIZACION_EN_CURSO("Regularización en curso"),
    CARGA_VIGENTE("Carga vigente"),
    PROCESO_JUDICIAL("Proceso judicial"),
    INFORMACION_INSUFICIENTE("Información insuficiente"),
    OTRO_MOTIVO_COMERCIAL("Otro motivo comercial");

    private final String etiqueta;

    MotivoDecision(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    String etiqueta() {
        return etiqueta;
    }
}
