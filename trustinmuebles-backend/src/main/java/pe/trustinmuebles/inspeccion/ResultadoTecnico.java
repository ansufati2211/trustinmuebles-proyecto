package pe.trustinmuebles.inspeccion;

/** Conclusión del informe técnico. La fija el especialista, nunca las reglas del sistema. */
public enum ResultadoTecnico {
    FAVORABLE("Favorable"),
    CON_OBSERVACIONES("Con observaciones físicas subsanables"),
    CON_RIESGO("Con riesgo estructural o de instalaciones");

    private final String etiqueta;

    ResultadoTecnico(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
