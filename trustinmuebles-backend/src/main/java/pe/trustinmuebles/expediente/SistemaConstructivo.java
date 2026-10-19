package pe.trustinmuebles.expediente;

/** Sistema constructivo que declara el plano de estructuras. */
public enum SistemaConstructivo {
    ALBANILERIA_CONFINADA("Albañilería confinada"),
    APORTICADO("Concreto armado (aporticado)"),
    ADOBE("Adobe o tapial"),
    OTRO("Otro sistema");

    private final String etiqueta;

    SistemaConstructivo(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
