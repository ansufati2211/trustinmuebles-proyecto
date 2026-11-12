package pe.trustinmuebles.expediente;

/**
 * v1.0: si el lote ya se independizó de la partida matriz. Es un dato del caso que se muestra en la ficha con una línea
 * de explicación; no cambia el indicador A.
 */
public enum Independizacion {
    PARTIDA_PROPIA("Partida propia",
            "El lote tiene su propia partida en el Registro de Predios, separada de la partida matriz."),
    EN_PARTIDA_MATRIZ("En partida matriz",
            "El lote todavía forma parte de la partida matriz: su independización está pendiente."),
    NO_CONSTA("No consta",
            "La documentación revisada no indica si el lote ya tiene partida propia. Conviene confirmarlo.");

    private final String etiqueta;
    private final String explicacion;

    Independizacion(String etiqueta, String explicacion) {
        this.etiqueta = etiqueta;
        this.explicacion = explicacion;
    }

    public String etiqueta() {
        return etiqueta;
    }

    public String explicacion() {
        return explicacion;
    }
}
