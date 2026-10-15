package pe.trustinmuebles.shared;

/** Niveles del semáforo (verde = seguro, amarillo = advertencia, rojo = riesgo). */
public enum NivelRiesgo {
    VERDE, AMARILLO, ROJO;

    public static NivelRiesgo peor(NivelRiesgo a, NivelRiesgo b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.ordinal() >= b.ordinal() ? a : b;
    }
}
