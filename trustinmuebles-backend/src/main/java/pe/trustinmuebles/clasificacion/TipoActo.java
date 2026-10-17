package pe.trustinmuebles.clasificacion;

/** Tipo de acto que consta en un asiento de la partida (simulada). */
public enum TipoActo {
    PRIMERA_INSCRIPCION("Primera inscripción"),
    INDEPENDIZACION("Independización"),
    COMPRAVENTA("Compraventa"),
    SUCESION("Sucesión"),
    HIPOTECA("Hipoteca"),
    EMBARGO("Embargo"),
    ANOTACION_DEMANDA("Anotación de demanda"),
    MEDIDA_CAUTELAR("Medida cautelar"),
    BLOQUEO("Bloqueo registral"),
    CARGA_TECNICA("Carga técnica"),
    SERVIDUMBRE("Servidumbre"),
    CANCELACION("Cancelación"),
    OTRO("Otro acto");

    private final String etiqueta;

    TipoActo(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
