package pe.trustinmuebles.clasificacion;

import java.util.List;

/** Resultado puro del motor: estado, motivos, faltantes y alertas conocidas (REQ-F05). */
public record ResultadoClasificacion(EstadoSemaforo estado, String etiqueta, List<Motivo> motivos,
        List<String> faltantes, List<Alerta> alertas, boolean noDescartaOtras, String versionReglas,
        List<String> reglasAplicadas, String limite) {

    /** tipo: FALTANTE, ALERTA, CONDICION o LIMITE. */
    public record Motivo(String tipo, String texto) {}

    public record Alerta(String regla, Prioridad prioridad, String titulo, String explicacion, String referencia,
            String descripcion) {}
}
