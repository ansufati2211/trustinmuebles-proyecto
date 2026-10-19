package pe.trustinmuebles.inspeccion;

/** Estado de la evaluación técnica presencial (indicador B). NO_SOLICITADA no se guarda: es la ausencia de solicitud. */
public enum EstadoTecnico {
    NO_SOLICITADA("No solicitada"),
    SOLICITADA("Solicitada"),
    EN_INSPECCION("En inspección por el especialista"),
    EMITIDO("Informe técnico emitido");

    private final String etiqueta;

    EstadoTecnico(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
