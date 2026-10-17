package pe.trustinmuebles.clasificacion;

/** Salida informativa. Verde no significa saneamiento ni seguridad de compra (RN-05). */
public enum EstadoSemaforo {
    VERDE("Sin alertas detectadas en los campos evaluados"),
    AMARILLO("Requiere revisión"),
    ROJO("Alerta prioritaria"),
    GRIS("Información insuficiente o condición no evaluable");

    private final String etiqueta;

    EstadoSemaforo(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
