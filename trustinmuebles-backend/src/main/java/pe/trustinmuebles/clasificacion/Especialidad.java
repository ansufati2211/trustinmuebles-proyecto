package pe.trustinmuebles.clasificacion;

/** Especialidades del expediente técnico de una vivienda. */
public enum Especialidad {
    ARQUITECTURA("Plano arquitectónico"),
    ESTRUCTURAS("Plano de estructuras"),
    ELECTRICAS("Plano de instalaciones eléctricas (II.EE.)"),
    SANITARIAS("Plano de instalaciones sanitarias (II.SS.)");

    private final String etiqueta;

    Especialidad(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
