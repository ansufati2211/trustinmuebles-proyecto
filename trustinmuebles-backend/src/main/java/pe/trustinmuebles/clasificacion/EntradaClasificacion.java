package pe.trustinmuebles.clasificacion;

import java.math.BigDecimal;
import java.util.List;

/**
 * Datos del expediente que el motor necesita. Es una copia por valor: este módulo no depende del de expedientes.
 * Las anotaciones son los asientos del rubro de gravámenes y cargas (D), con su estado ya normalizado.
 * Los planos solo se evalúan en una vivienda; en un lote no aplican.
 */
public record EntradaClasificacion(String condicionRepresentada, String titularidad, Completitud completitud,
        List<AnotacionEntrada> anotaciones, TipoPredio tipoPredio, BigDecimal areaInscrita,
        List<PlanoEntrada> planos) {

    /** Entrada de un lote, sin planos. */
    public EntradaClasificacion(String condicionRepresentada, String titularidad, Completitud completitud,
            List<AnotacionEntrada> anotaciones) {
        this(condicionRepresentada, titularidad, completitud, anotaciones, TipoPredio.LOTE, null, List.of());
    }

    public record AnotacionEntrada(String referencia, EstadoAnotacion estado, String descripcion, TipoActo tipoActo) {}

    public record PlanoEntrada(Especialidad especialidad, EstadoPlano estado, BigDecimal areaConstruida) {}
}
