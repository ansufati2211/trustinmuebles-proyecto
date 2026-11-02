package pe.trustinmuebles.expediente;

/**
 * Esfuerzo de regularización de un motivo (v0.8, decisión 3). Criterio del equipo, borrador pendiente de revisión
 * especializada. No es un plazo ni un costo: el orden solo sirve para organizar la subsanación.
 */
public enum Esfuerzo {
    BAJO("Bajo: solo documentos que aporta el propietario"),
    MEDIO("Medio: requiere a un tercero, sin proceso judicial"),
    ALTO("Alto: requiere un proceso judicial o administrativo");

    private final String etiqueta;

    Esfuerzo(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
