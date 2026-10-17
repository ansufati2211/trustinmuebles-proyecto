package pe.trustinmuebles.clasificacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.clasificacion.EntradaClasificacion.AnotacionEntrada;

/**
 * Pruebas del motor puro (REQ-F05, RN-02 a RN-06). La regla prioritaria que se usa aquí existe solo dentro del test
 * y es ficticia: la tabla jurídica real que distingue rojo de amarillo requiere revisión especializada.
 */
class MotorClasificacionTest {
    static final String CONDICION = "Lote urbano inscrito, según el escenario.";
    static final List<String> CONTEMPLADAS = List.of(CONDICION);

    static final ReglaAplicable RV01 = new ReglaAplicable("RV-01", Prioridad.REVISION, TipoCondicion.ANOTACION_VIGENTE,
            null, "Anotación con estado vigente", "El caso registra una anotación vigente.");
    /** Regla ficticia solo para probar la precedencia. NO es una regla jurídica. */
    static final ReglaAplicable PRUEBA_PRIORITARIA = new ReglaAplicable("TEST-P", Prioridad.PRIORITARIA,
            TipoCondicion.ANOTACION_VIGENTE, "T", "Regla de prueba, no jurídica", "Solo para pruebas del motor.");

    static AnotacionEntrada anot(String ref, EstadoAnotacion estado) {
        return new AnotacionEntrada(ref, estado, "Anotación " + ref);
    }

    static EntradaClasificacion caso(String condicion, String titular, Completitud completitud,
            AnotacionEntrada... anotaciones) {
        return new EntradaClasificacion(condicion, titular, completitud, List.of(anotaciones));
    }

    static ResultadoClasificacion evaluar(EntradaClasificacion e, ReglaAplicable... reglas) {
        return MotorClasificacion.evaluar(e, List.of(reglas), CONTEMPLADAS, "v-test");
    }

    @Test
    @DisplayName("CP-05a sin alertas y con datos completos: VERDE con alcance limitado")
    void verde() {
        var r = evaluar(caso(CONDICION, "Titular Delta", Completitud.COMPLETA, anot("B1", EstadoAnotacion.CANCELADA)),
                RV01);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.VERDE);
        assertThat(r.alertas()).isEmpty();
        assertThat(r.faltantes()).isEmpty();
        assertThat(r.limite()).contains("No certifica saneamiento ni recomienda comprar");
        assertThat(r.motivos()).anyMatch(m -> m.texto().contains("no significa saneamiento"));
    }

    @Test
    @DisplayName("CP-05b regla de revisión da AMARILLO; con una prioritaria ficticia da ROJO (precedencia RN-03)")
    void amarilloYRojoPorPrecedencia() {
        var amarillo = evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA, anot("B2", EstadoAnotacion.VIGENTE)),
                RV01, PRUEBA_PRIORITARIA);
        assertThat(amarillo.estado()).isEqualTo(EstadoSemaforo.AMARILLO);

        var rojo = evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA, anot("B2", EstadoAnotacion.VIGENTE),
                anot("T1", EstadoAnotacion.VIGENTE)), RV01, PRUEBA_PRIORITARIA);
        assertThat(rojo.estado()).isEqualTo(EstadoSemaforo.ROJO);
        assertThat(rojo.alertas()).extracting(ResultadoClasificacion.Alerta::regla)
                .contains("RV-01", "TEST-P");
    }

    @Test
    @DisplayName("CP-05c datos faltantes dan GRIS y conservan las alertas conocidas (RN-04)")
    void grisConservaAlertas() {
        var r = evaluar(caso(CONDICION, "desconocido", Completitud.INCOMPLETA, anot("B4", EstadoAnotacion.VIGENTE)),
                RV01, PRUEBA_PRIORITARIA);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.faltantes()).containsExactly("Titularidad", "Completitud del extracto");
        assertThat(r.alertas()).hasSize(1).first().extracting(ResultadoClasificacion.Alerta::referencia)
                .isEqualTo("B4");
        assertThat(r.noDescartaOtras()).isTrue();
        assertThat(r.motivos()).anyMatch(m -> m.texto().contains("no se descartan otras alertas"));
    }

    @Test
    @DisplayName("CP-05c una prioritaria con datos faltantes sigue siendo GRIS y mantiene la alerta visible")
    void faltantesGanaAPrioritaria() {
        var r = evaluar(caso(CONDICION, "desconocido", Completitud.COMPLETA, anot("T9", EstadoAnotacion.VIGENTE)),
                PRUEBA_PRIORITARIA);
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.alertas()).extracting(ResultadoClasificacion.Alerta::prioridad).containsExactly(Prioridad.PRIORITARIA);
    }

    @Test
    @DisplayName("RN-02 desconocido no equivale a ausencia: titularidad, completitud y estado de anotación")
    void desconocidoNoEsAusencia() {
        assertThat(evaluar(caso(CONDICION, "  Desconocido ", Completitud.COMPLETA)).estado())
                .isEqualTo(EstadoSemaforo.GRIS);
        assertThat(evaluar(caso(CONDICION, "Titular", Completitud.DESCONOCIDA)).estado())
                .isEqualTo(EstadoSemaforo.GRIS);
        var r = evaluar(caso(CONDICION, "Titular", Completitud.COMPLETA, anot("B5", EstadoAnotacion.DESCONOCIDO)));
        assertThat(r.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(r.faltantes()).containsExactly("Estado de la anotación B5");
        assertThat(evaluar(caso("", "Titular", Completitud.COMPLETA)).faltantes()).contains("Condición representada");
    }

    @Test
    @DisplayName("CP-05d condición no contemplada da GRIS; si hay alerta de mayor precedencia, esa manda")
    void condicionNoContemplada() {
        var gris = evaluar(caso("Posesión sin inscripción", "Titular", Completitud.COMPLETA), RV01);
        assertThat(gris.estado()).isEqualTo(EstadoSemaforo.GRIS);
        assertThat(gris.motivos()).anyMatch(m -> m.tipo().equals("CONDICION"));

        var rojo = evaluar(caso("Posesión sin inscripción", "Titular", Completitud.COMPLETA,
                anot("T1", EstadoAnotacion.VIGENTE)), PRUEBA_PRIORITARIA);
        assertThat(rojo.estado()).isEqualTo(EstadoSemaforo.ROJO);
        assertThat(rojo.motivos()).anyMatch(m -> m.tipo().equals("CONDICION"));

        var amarillo = evaluar(caso("Posesión sin inscripción", "Titular", Completitud.COMPLETA,
                anot("B2", EstadoAnotacion.VIGENTE)), RV01);
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
