package pe.trustinmuebles.expediente;

import java.util.List;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;

/**
 * Ruta de regularización de un caso (v0.8): un ítem por motivo de la evaluación vigente (alerta, dato faltante o
 * condición no contemplada). {@code esfuerzo} es el máximo de sus ítems, o null si no hay pasos. Solo lectura: se
 * deriva de la evaluación y no la cambia. Orientativa, sin plazos ni costos.
 */
public record RutaRegularizacion(String codigo, EstadoSemaforo estado, Esfuerzo esfuerzo, String esfuerzoEtiqueta,
        List<Item> items, List<String> tiposAlerta, String mensaje, String aviso, String plazoGeneral,
        String estadoRevision, String versionContenido) {

    /** tipo: ALERTA, FALTANTE o CONDICION. clave: código de la regla (RP-01…) o del faltante (TITULARIDAD…). */
    public record Item(String tipo, String clave, String referencia, String titulo, List<String> pasos,
            String gestiona, String documentoRequerido, Esfuerzo esfuerzo, String esfuerzoEtiqueta, String nota) {}

    public boolean sinPasos() {
        return items.isEmpty();
    }
}
