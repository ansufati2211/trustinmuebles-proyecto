package pe.trustinmuebles.clasificacion;

/**
 * v0.9: documentos del expediente de un lote. El plano perimétrico y la memoria descriptiva son datos mínimos (sin ellos el
 * indicador A queda en gris); el certificado de zonificación y vías genera una alerta de revisión; la tasación es
 * informativa y no cambia el color.
 */
public enum DocumentoLote {
    PLANO_PERIMETRICO("Plano perimétrico y de ubicación"),
    MEMORIA_DESCRIPTIVA("Memoria descriptiva"),
    CERTIFICADO_ZONIFICACION("Certificado de zonificación y vías"),
    TASACION("Tasación");

    private final String etiqueta;

    DocumentoLote(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
