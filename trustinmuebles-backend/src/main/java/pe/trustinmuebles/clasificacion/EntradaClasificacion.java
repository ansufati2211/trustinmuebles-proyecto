package pe.trustinmuebles.clasificacion;

import java.math.BigDecimal;
import java.util.List;

/**
 * Datos del expediente que el motor necesita. Es una copia por valor: este módulo no depende del de expedientes.
 * Las anotaciones son los asientos del rubro de gravámenes y cargas (D), con su estado ya normalizado.
 * Los planos solo se evalúan en una vivienda; los documentos del lote (v0.9), solo en un lote.
 */
public record EntradaClasificacion(String condicionRepresentada, String titularidad, Completitud completitud,
        List<AnotacionEntrada> anotaciones, TipoPredio tipoPredio, BigDecimal areaInscrita,
        List<PlanoEntrada> planos, List<DocumentoLoteEntrada> documentosLote) {

    public EntradaClasificacion {
        planos = planos == null ? List.of() : planos;
        documentosLote = documentosLote == null ? List.of() : documentosLote;
    }

    /** Entrada sin documentos del lote (una vivienda, o un lote al que aún no se le cargan). */
    public EntradaClasificacion(String condicionRepresentada, String titularidad, Completitud completitud,
            List<AnotacionEntrada> anotaciones, TipoPredio tipoPredio, BigDecimal areaInscrita,
            List<PlanoEntrada> planos) {
        this(condicionRepresentada, titularidad, completitud, anotaciones, tipoPredio, areaInscrita, planos, List.of());
    }

    /** Entrada de un lote, sin planos ni documentos. */
    public EntradaClasificacion(String condicionRepresentada, String titularidad, Completitud completitud,
            List<AnotacionEntrada> anotaciones) {
        this(condicionRepresentada, titularidad, completitud, anotaciones, TipoPredio.LOTE, null, List.of(), List.of());
    }

    public record AnotacionEntrada(String referencia, EstadoAnotacion estado, String descripcion, TipoActo tipoActo) {}

    public record PlanoEntrada(Especialidad especialidad, EstadoPlano estado, BigDecimal areaConstruida) {}

    /** Un documento del lote y su estado documental (presentado, observado, no presentado o no aplica). */
    public record DocumentoLoteEntrada(DocumentoLote tipo, EstadoPlano estado) {}
}
