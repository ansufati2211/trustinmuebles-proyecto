package pe.trustinmuebles.expediente;

/** v1.0 (etapa 3a): estado de un hito del proyecto. Es informativo y no interviene en el indicador A. */
public enum EstadoHito {
    COMPLETADO("Completado"),
    EN_PROCESO("En proceso"),
    PENDIENTE("Pendiente");

    private final String etiqueta;

    EstadoHito(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
