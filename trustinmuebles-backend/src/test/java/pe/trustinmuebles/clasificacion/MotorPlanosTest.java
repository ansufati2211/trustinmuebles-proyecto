package pe.trustinmuebles.clasificacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.clasificacion.EntradaClasificacion.PlanoEntrada;

/** Reglas documentales sobre el expediente técnico de planos (indicador A). El estado físico nunca entra aquí. */
class MotorPlanosTest {
    static final String CONDICION = MotorClasificacionTest.CONDICION;

    static ReglaAplicable regla(String codigo, TipoCondicion tipo) {
        return new ReglaAplicable(codigo, Prioridad.REVISION, tipo, null, Set.of(), "Regla " + codigo, "Explicación");
    }

    static final List<ReglaAplicable> TABLA = List.of(MotorClasificacionTest.EMBARGO,
            regla("RV-04", TipoCondicion.PLANO_NO_PRESENTADO), regla("RV-05", TipoCondicion.DISCREPANCIA_AREA),
            regla("RV-06", TipoCondicion.PLANO_OBSERVADO));

    static PlanoEntrada plano(Especialidad e, EstadoPlano estado, String area) {
        return new PlanoEntrada(e, estado, area == null ? null : new BigDecimal(area));
    }

    static List<PlanoEntrada> completos() {
        return List.of(plano(Especialidad.ARQUITECTURA, EstadoPlano.PRESENTADO, "84.50"),
                plano(Especialidad.ESTRUCTURAS, EstadoPlano.PRESENTADO, null),
                plano(Especialidad.ELECTRICAS, EstadoPlano.PRESENTADO, null),
                plano(Especialidad.SANITARIAS, EstadoPlano.PRESENTADO, null));
    }

    static ResultadoClasificacion vivienda(String inscrita, List<PlanoEntrada> planos) {
        var e = new EntradaClasificacion(CONDICION, "Titular", Completitud.COMPLETA, List.of(), TipoPredio.VIVIENDA,
                inscrita == null ? null : new BigDecimal(inscrita), planos);
        return MotorClasificacion.evaluar(e, TABLA, List.of(CONDICION), "v-test");
    }

    @Test
    @DisplayName("Una vivienda con sus 4 planos y el área que coincide da VERDE")
    void viviendaCompletaVerde() {
        var r = vivienda("84.50", completos());
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.VERDE);
        assertThat(r.alertas()).isEmpty();
    }

    @Test
    @DisplayName("Si falta el plano de II.EE. o de II.SS. en una vivienda: AMARILLO con una alerta por plano")
    void faltaInstalaciones() {
        var planos = List.of(plano(Especialidad.ARQUITECTURA, EstadoPlano.PRESENTADO, "84.50"),
                plano(Especialidad.ESTRUCTURAS, EstadoPlano.PRESENTADO, null),
                plano(Especialidad.ELECTRICAS, EstadoPlano.NO_PRESENTADO, null));
        var r = vivienda("84.50", planos);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(r.alertas()).extracting(ResultadoClasificacion.Alerta::regla).containsExactly("RV-04", "RV-04");
        // Un plano que no figura cuenta como no presentado.
        assertThat(r.alertas()).extracting(ResultadoClasificacion.Alerta::referencia)
                .containsExactly(Especialidad.ELECTRICAS.etiqueta(), Especialidad.SANITARIAS.etiqueta());
    }

    @Test
    @DisplayName("Sin plano arquitectónico o de estructuras, una vivienda no se puede evaluar: GRIS con faltantes")
    void faltaArquitecturaOEstructuras() {
        var r = vivienda("84.50", List.of());
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.faltantes()).contains(Especialidad.ARQUITECTURA.etiqueta(), Especialidad.ESTRUCTURAS.etiqueta());
    }

    @Test
    @DisplayName("Más de 1 % de diferencia entre el plano y el área inscrita, o ninguna inscrita: AMARILLO")
    void discrepanciaDeArea() {
        var distinta = vivienda("96.00", completos());
        assertThat(distinta.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(distinta.alertas()).extracting(ResultadoClasificacion.Alerta::regla).containsExactly("RV-05");
        assertThat(distinta.alertas().get(0).descripcion()).contains("84.50", "96.00");

        assertThat(vivienda("85.00", completos()).estado()).as("0,6 % está dentro del margen").isEqualTo(EstadoSemaforo.VERDE);

        var sinInscrita = vivienda(null, completos());
        assertThat(sinInscrita.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(sinInscrita.alertas().get(0).descripcion()).contains("No consta");
    }

    @Test
    @DisplayName("Un plano observado por el revisor da AMARILLO")
    void planoObservado() {
        var planos = List.of(plano(Especialidad.ARQUITECTURA, EstadoPlano.PRESENTADO, "84.50"),
                plano(Especialidad.ESTRUCTURAS, EstadoPlano.OBSERVADO, null),
                plano(Especialidad.ELECTRICAS, EstadoPlano.PRESENTADO, null),
                plano(Especialidad.SANITARIAS, EstadoPlano.PRESENTADO, null));
        var r = vivienda("84.50", planos);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(r.alertas()).extracting(ResultadoClasificacion.Alerta::regla).containsExactly("RV-06");
    }

    @Test
    @DisplayName("En un lote los planos no aplican: no generan faltantes ni alertas")
    void loteSinPlanos() {
        var e = new EntradaClasificacion(CONDICION, "Titular", Completitud.COMPLETA, List.of());
        var r = MotorClasificacion.evaluar(e, TABLA, List.of(CONDICION), "v-test");
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.VERDE);
        assertThat(r.alertas()).isEmpty();
    }

    @Test
    @DisplayName("Los planos no tapan una alerta registral: embargo vigente con planos completos sigue en ROJO")
    void losPlanosNoCambianElRojo() {
        var anotaciones = List.of(MotorClasificacionTest.acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.EMBARGO));
        var e = new EntradaClasificacion(CONDICION, "Titular", Completitud.COMPLETA, anotaciones, TipoPredio.VIVIENDA,
                new BigDecimal("84.50"), completos());
        assertThat(MotorClasificacion.evaluar(e, TABLA, List.of(CONDICION), "v-test").estado())
                .isEqualTo(EstadoSemaforo.ROJO);
    }
}
