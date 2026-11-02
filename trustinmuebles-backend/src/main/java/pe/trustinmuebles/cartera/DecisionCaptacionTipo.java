package pe.trustinmuebles.cartera;

/** v0.8: decisión de captación del gestor (lista cerrada). No cambia A ni B ni bloquea publicar (I15). */
enum DecisionCaptacionTipo {
    CAPTAR("Captar"),
    CAPTAR_CON_CONDICIONES("Captar con condiciones"),
    NO_CAPTAR_POR_AHORA("No captar por ahora");

    private final String etiqueta;

    DecisionCaptacionTipo(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    String etiqueta() {
        return etiqueta;
    }
}
