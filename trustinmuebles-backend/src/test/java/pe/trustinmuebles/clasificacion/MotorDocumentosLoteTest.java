package pe.trustinmuebles.clasificacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.clasificacion.EntradaClasificacion.DocumentoLoteEntrada;

/**
 * v0.9 (reglas v0.5): documentos del lote como requisitos del indicador A. Sin plano perimétrico o sin memoria
 * descriptiva el lote queda en gris; sin certificado de zonificación, en amarillo (RV-07); la tasación es informativa.
 */
class MotorDocumentosLoteTest {
    static final String CONDICION = MotorClasificacionTest.CONDICION;

    static final List<ReglaAplicable> TABLA = List.of(MotorClasificacionTest.EMBARGO,
            MotorPlanosTest.regla("RV-06", TipoCondicion.PLANO_OBSERVADO),
            MotorPlanosTest.regla("RV-07", TipoCondicion.DOCUMENTO_LOTE_NO_PRESENTADO));

    /** Lote con todos sus documentos presentados, salvo los indicados, que cambian de estado. */
    static ResultadoClasificacion lote(EstadoPlano estadoCambiado, DocumentoLote... cambiados) {
        List<DocumentoLoteEntrada> docs = new ArrayList<>();
        for (DocumentoLote d : DocumentoLote.values()) {
            boolean cambia = Set.of(cambiados).contains(d);
            if (cambia && estadoCambiado == null) continue; // null: el documento no figura
            docs.add(new DocumentoLoteEntrada(d, cambia ? estadoCambiado : EstadoPlano.PRESENTADO));
        }
        var e = new EntradaClasificacion(CONDICION, "Titular", Completitud.COMPLETA, List.of(), TipoPredio.LOTE, null,
                List.of(), docs);
        return MotorClasificacion.evaluar(e, TABLA, List.of(CONDICION), "v-test");
    }

    @Test
    @DisplayName("Lote con sus cuatro documentos: VERDE")
    void completo() {
        assertThat(lote(null).estado()).isEqualTo(EstadoSemaforo.VERDE);
    }

    @Test
    @DisplayName("Sin plano perimétrico el lote no se puede evaluar: GRIS con el faltante")
    void sinPerimetrico() {
        var r = lote(EstadoPlano.NO_PRESENTADO, DocumentoLote.PLANO_PERIMETRICO);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.faltantes()).containsExactly("Plano perimétrico y de ubicación");
    }

    @Test
    @DisplayName("Sin memoria descriptiva (aunque no figure en la lista): GRIS con el faltante")
    void sinMemoria() {
        var r = lote(null, DocumentoLote.MEMORIA_DESCRIPTIVA);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.faltantes()).containsExactly("Memoria descriptiva");
    }

    @Test
    @DisplayName("Sin certificado de zonificación y vías: AMARILLO por RV-07")
    void sinZonificacion() {
        var r = lote(EstadoPlano.NO_PRESENTADO, DocumentoLote.CERTIFICADO_ZONIFICACION);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(r.alertas()).extracting(ResultadoClasificacion.Alerta::regla).containsExactly("RV-07");
        assertThat(r.alertas().get(0).referencia()).isEqualTo("Certificado de zonificación y vías");
    }

    @Test
    @DisplayName("Una zonificación que no aplica no genera la alerta")
    void zonificacionNoAplica() {
        assertThat(lote(EstadoPlano.NO_APLICA, DocumentoLote.CERTIFICADO_ZONIFICACION).estado())
                .isEqualTo(EstadoSemaforo.VERDE);
    }

    @Test
    @DisplayName("La tasación es informativa: sin ella el lote sigue en VERDE")
    void sinTasacion() {
        var r = lote(EstadoPlano.NO_PRESENTADO, DocumentoLote.TASACION);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.VERDE);
        assertThat(r.faltantes()).isEmpty();
    }

    @Test
    @DisplayName("Un documento del lote observado: AMARILLO por RV-06")
    void observado() {
        var r = lote(EstadoPlano.OBSERVADO, DocumentoLote.MEMORIA_DESCRIPTIVA);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(r.alertas()).extracting(ResultadoClasificacion.Alerta::regla).containsExactly("RV-06");
    }

    @Test
    @DisplayName("En gris se conserva la alerta de zonificación (RN-04)")
    void grisConservaRv07() {
        var r = lote(EstadoPlano.NO_PRESENTADO, DocumentoLote.MEMORIA_DESCRIPTIVA, DocumentoLote.CERTIFICADO_ZONIFICACION);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.alertas()).extracting(ResultadoClasificacion.Alerta::regla).containsExactly("RV-07");
        assertThat(r.noDescartaOtras()).isTrue();
    }

    @Test
    @DisplayName("Los documentos del lote no aplican a una vivienda: sin ellos, una vivienda completa sigue en VERDE")
    void viviendaNoLosNecesita() {
        var e = new EntradaClasificacion(CONDICION, "Titular", Completitud.COMPLETA, List.of(), TipoPredio.VIVIENDA,
                new BigDecimal("84.50"), MotorPlanosTest.completos());
        assertThat(MotorClasificacion.evaluar(e, TABLA, List.of(CONDICION), "v-test").estado())
                .isEqualTo(EstadoSemaforo.VERDE);
    }
}
