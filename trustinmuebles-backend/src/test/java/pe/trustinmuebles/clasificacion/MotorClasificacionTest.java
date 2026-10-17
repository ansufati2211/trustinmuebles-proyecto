package pe.trustinmuebles.clasificacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.clasificacion.EntradaClasificacion.AnotacionEntrada;

/**
 * Pruebas del motor puro (REQ-F05, RN-02 a RN-06). Las reglas de este test replican en forma resumida la tabla borrador
 * v0.2, que sigue pendiente de revisión especializada. La prueba de integración usa las reglas reales del contenido.
 */
class MotorClasificacionTest {
    static final String CONDICION = "Lote urbano inscrito, según el escenario.";
    static final List<String> CONTEMPLADAS = List.of(CONDICION);

    static ReglaAplicable regla(String codigo, Prioridad prioridad, TipoActo... tipos) {
        return new ReglaAplicable(codigo, prioridad, TipoCondicion.ANOTACION_VIGENTE, null, Set.of(tipos),
                "Regla " + codigo, "Explicación de " + codigo);
    }

    static final ReglaAplicable EMBARGO = regla("RP-01", Prioridad.PRIORITARIA, TipoActo.EMBARGO);
    static final ReglaAplicable DEMANDA = regla("RP-02", Prioridad.PRIORITARIA, TipoActo.ANOTACION_DEMANDA, TipoActo.MEDIDA_CAUTELAR);
    static final ReglaAplicable HIPOTECA = regla("RV-02", Prioridad.REVISION, TipoActo.HIPOTECA);
    static final ReglaAplicable OTRO = regla("RV-01", Prioridad.REVISION, TipoActo.OTRO);
    static final List<ReglaAplicable> TABLA = List.of(EMBARGO, DEMANDA, HIPOTECA, OTRO);

    static AnotacionEntrada acto(String ref, EstadoAnotacion estado, TipoActo tipo) {
        return new AnotacionEntrada(ref, estado, tipo.etiqueta(), tipo);
    }

    static EntradaClasificacion caso(String condicion, String titular, Completitud completitud,
            AnotacionEntrada... anotaciones) {
        return new EntradaClasificacion(condicion, titular, completitud, List.of(anotaciones));
    }

    static ResultadoClasificacion evaluar(EntradaClasificacion e) {
        return MotorClasificacion.evaluar(e, TABLA, CONTEMPLADAS, "v-test");
    }

    @Test
    @DisplayName("CP-05a sin alertas vigentes y con datos completos: VERDE con alcance limitado")
    void verde() {
        var r = evaluar(caso(CONDICION, "Rosa Elena Cárdenas Vilca (100 %)", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.CANCELADA, TipoActo.HIPOTECA)));
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.VERDE);
        assertThat(r.alertas()).isEmpty();
        assertThat(r.faltantes()).isEmpty();
        assertThat(r.limite()).contains("No certifica saneamiento ni recomienda comprar");
        assertThat(r.motivos()).anyMatch(m -> m.texto().contains("no significa saneamiento"));
    }

    @Test
    @DisplayName("CP-05b una hipoteca vigente da AMARILLO; un embargo vigente da ROJO (tabla borrador)")
    void amarilloYRojoPorTipoDeActo() {
        var amarillo = evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.HIPOTECA)));
        assertThat(amarillo.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(amarillo.reglasAplicadas()).containsExactly("RV-02");

        var rojo = evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.HIPOTECA),
                acto("D00002", EstadoAnotacion.VIGENTE, TipoActo.EMBARGO)));
        assertThat(rojo.estado()).isEqualTo(EstadoSemaforo.ROJO);
        // Las alertas salen en el orden de la tabla: las prioritarias primero, que es lo que debe leerse antes.
        assertThat(rojo.alertas()).extracting(ResultadoClasificacion.Alerta::regla).containsExactly("RP-01", "RV-02");
    }

    @Test
    @DisplayName("Una medida cautelar y una anotación de demanda vigentes dan ROJO")
    void demandaYMedidaCautelar() {
        assertThat(evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.ANOTACION_DEMANDA))).estado())
                .isEqualTo(EstadoSemaforo.ROJO);
        assertThat(evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.MEDIDA_CAUTELAR))).estado())
                .isEqualTo(EstadoSemaforo.ROJO);
    }

    @Test
    @DisplayName("Un embargo cancelado no alerta y la copropiedad tampoco")
    void canceladoYCopropiedadNoAlertan() {
        var r = evaluar(caso(CONDICION, "Marco Antonio Quispe Huamaní (50 %) y Lucía Fernanda Torres Gutiérrez (50 %)",
                Completitud.COMPLETA, acto("D00001", EstadoAnotacion.CANCELADA, TipoActo.EMBARGO)));
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.VERDE);
        assertThat(r.alertas()).isEmpty();
    }

    @Test
    @DisplayName("Un tipo de acto sin regla propia cae en la regla genérica de otro acto vigente")
    void tipoSinReglaPropia() {
        var r = evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.OTRO)));
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(r.reglasAplicadas()).containsExactly("RV-01");
    }

    @Test
    @DisplayName("CP-05c datos faltantes dan GRIS y conservan la alerta prioritaria conocida (RN-04)")
    void grisConservaAlertas() {
        var r = evaluar(caso(CONDICION, "desconocido", Completitud.INCOMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.ANOTACION_DEMANDA)));
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.faltantes()).containsExactly("Titularidad", "Completitud del extracto");
        assertThat(r.alertas()).hasSize(1);
        assertThat(r.alertas().get(0).prioridad()).isEqualTo(Prioridad.PRIORITARIA);
        assertThat(r.alertas().get(0).referencia()).isEqualTo("D00001");
        assertThat(r.noDescartaOtras()).isTrue();
        assertThat(r.motivos()).anyMatch(m -> m.texto().contains("no se descartan otras alertas"));
    }

    @Test
    @DisplayName("RN-02 desconocido no equivale a ausencia: titularidad, completitud y estado de un gravamen")
    void desconocidoNoEsAusencia() {
        assertThat(evaluar(caso(CONDICION, "  Desconocido ", Completitud.COMPLETA)).estado())
                .isEqualTo(EstadoSemaforo.GRIS);
        assertThat(evaluar(caso(CONDICION, "Titular", Completitud.DESCONOCIDA)).estado())
                .isEqualTo(EstadoSemaforo.GRIS);
        var r = evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA,
                acto("D00003", EstadoAnotacion.DESCONOCIDO, TipoActo.HIPOTECA)));
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.faltantes()).containsExactly("Estado de la anotación D00003");
        assertThat(evaluar(caso("", "Titular", Completitud.COMPLETA)).faltantes()).contains("Condición representada");
    }

    @Test
    @DisplayName("CP-05d condición no contemplada da GRIS; si hay alerta de mayor precedencia, esa manda")
    void condicionNoContemplada() {
        var gris = evaluar(caso("Posesión sin inscripción", "Titular", Completitud.COMPLETA));
        assertThat(gris.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(gris.motivos()).anyMatch(m -> m.tipo().equals("CONDICION"));

        var rojo = evaluar(caso("Posesión sin inscripción", "Titular", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.EMBARGO)));
        assertThat(rojo.estado()).isEqualTo(EstadoSemaforo.ROJO);
        assertThat(rojo.motivos()).anyMatch(m -> m.tipo().equals("CONDICION"));

        var amarillo = evaluar(caso("Posesión sin inscripción", "Titular", Completitud.COMPLETA,
                acto("D00001", EstadoAnotacion.VIGENTE, TipoActo.HIPOTECA)));
        assertThat(amarillo.estado()).isEqualTo(EstadoSemaforo.AMARILLO);
        assertThat(amarillo.motivos()).anyMatch(m -> m.tipo().equals("CONDICION"));
    }

    @Test
    @DisplayName("La comparación de condiciones ignora mayúsculas, tildes y espacios")
    void normalizacion() {
        var r = evaluar(caso("  LOTE URBANO INSCRITO,   SEGUN EL ESCENARIO. ", "Titular", Completitud.COMPLETA));
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.VERDE);
    }

    @Test
    @DisplayName("Toda salida lleva la versión de reglas aplicada")
    void llevaVersion() {
        assertThat(evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA)).versionReglas()).isEqualTo("v-test");
    }
}
