package pe.trustinmuebles.semaforo;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.registro.Asiento;
import pe.trustinmuebles.registro.CopiaLiteral;
import pe.trustinmuebles.registro.TipoAsiento;
import pe.trustinmuebles.shared.NivelRiesgo;

class MotorSemaforoTest {
    private final MotorSemaforo motor = new MotorSemaforo(new CatalogoExplicaciones());
    private static final Asiento DOMINIO = new Asiento(TipoAsiento.DOMINIO, "Compraventa", true, LocalDate.of(2020, 1, 1));

    private NivelRiesgo nivel(CopiaLiteral c, String vendedor, double area) {
        return motor.evaluar(c, vendedor, area).stream().map(MotorSemaforo.Resultado::nivel)
                .reduce(NivelRiesgo.VERDE, NivelRiesgo::peor);
    }

    private CopiaLiteral copia(Asiento... extra) {
        List<Asiento> asientos = new java.util.ArrayList<>(List.of(DOMINIO));
        asientos.addAll(List.of(extra));
        return new CopiaLiteral("1", "Zona", "Lucía Salas Medina", 100, asientos);
    }

    @Test
    void sinCargasEsVerde() {
        assertThat(motor.evaluar(copia(), "Lucia Salas Medina", 100)).isEmpty();
    }

    @Test
    void hipotecaVigenteEsAmarillo() {
        var c = copia(new Asiento(TipoAsiento.HIPOTECA, "Hipoteca", true, null));
        assertThat(nivel(c, "Lucía Salas Medina", 100)).isEqualTo(NivelRiesgo.AMARILLO);
    }

    @Test
    void hipotecaCanceladaNoCuenta() {
        var c = copia(new Asiento(TipoAsiento.HIPOTECA, "Hipoteca", false, null));
        assertThat(motor.evaluar(c, "Lucía Salas Medina", 100)).isEmpty();
    }

    @Test
    void embargoBloqueoDemandaYMedidaCautelarSonRojo() {
        for (TipoAsiento t : List.of(TipoAsiento.EMBARGO, TipoAsiento.BLOQUEO, TipoAsiento.DEMANDA,
                TipoAsiento.MEDIDA_CAUTELAR)) {
            assertThat(nivel(copia(new Asiento(t, "x", true, null)), "Lucía Salas Medina", 100))
                    .as(t.name()).isEqualTo(NivelRiesgo.ROJO);
        }
    }

    @Test
    void vendedorDistintoDelTitularEsRojo() {
        assertThat(nivel(copia(), "Otra Persona", 100)).isEqualTo(NivelRiesgo.ROJO);
    }

    @Test
    void areaDiscrepanteMasDel5PorCientoEsAmarillo() {
        assertThat(nivel(copia(), "Lucía Salas Medina", 104)).isEqualTo(NivelRiesgo.VERDE);
        assertThat(nivel(copia(), "Lucía Salas Medina", 110)).isEqualTo(NivelRiesgo.AMARILLO);
    }

    @Test
    void elPeorNivelGana() {
        var c = copia(new Asiento(TipoAsiento.HIPOTECA, "h", true, null), new Asiento(TipoAsiento.EMBARGO, "e", true, null));
        assertThat(nivel(c, "Lucía Salas Medina", 100)).isEqualTo(NivelRiesgo.ROJO);
    }

    @Test
    void cadaHallazgoTraeExplicacionEnLenguajeSimple() {
        var c = copia(new Asiento(TipoAsiento.EMBARGO, "e", true, null));
        assertThat(motor.evaluar(c, "Lucía Salas Medina", 100)).allSatisfy(h -> {
            assertThat(h.explicacion()).isNotBlank();
            assertThat(h.recomendacion()).isNotBlank();
        });
    }
}
