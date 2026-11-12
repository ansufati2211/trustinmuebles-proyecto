package pe.trustinmuebles.expediente;

/** v1.0: disponibilidad comercial del inmueble. Es informativa y no interviene en el color de las reglas. */
public enum EstadoComercial {
    DISPONIBLE("Disponible"),
    SEPARADO("Separado"),
    VENDIDO("Vendido");

    private final String etiqueta;

    EstadoComercial(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
