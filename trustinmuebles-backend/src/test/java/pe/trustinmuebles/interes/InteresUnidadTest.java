package pe.trustinmuebles.interes;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.trustinmuebles.interes.Opciones.EstadoCita;
import pe.trustinmuebles.interes.Opciones.Franja;

/** v1.0 (etapa 4): fechas de la precarga relativas al arranque y rangos de presupuesto del resumen de demanda. */
class InteresUnidadTest {

    static Cita cita(EstadoCita estado, int desfase, boolean dos) {
        Cita c = new Cita();
        c.setEstado(estado);
        c.setFranja1(Franja.MANANA);
        if (dos) c.setFranja2(Franja.TARDE);
        c.setSemillaDesfase(desfase);
        return c;
    }

    @Test
    @DisplayName("las citas precargadas se mueven con el día de arranque y nunca quedan en el pasado")
    void fechasRelativas() {
        for (LocalDate hoy : new LocalDate[] {LocalDate.of(2026, 11, 16), LocalDate.of(2027, 3, 1)}) {
            for (var fc : InteresSeeder.CITAS) {
                Cita c = cita(fc.estado(), fc.desfase(), fc.dosOpciones());
                InteresSeeder.fechas(c, hoy);
                LocalDate cuando = c.getFechaAcordada() != null ? c.getFechaAcordada() : c.getFecha1();
                assertThat(cuando).isAfterOrEqualTo(hoy).isBefore(hoy.plusDays(7));
                assertThat(c.getFechaAcordada() != null).isEqualTo(fc.estado().agendada());
            }
        }
        Cita r = cita(EstadoCita.REPROGRAMADA, 4, false);
        InteresSeeder.fechas(r, LocalDate.of(2026, 11, 16));
        assertThat(r.getFecha1()).isNotEqualTo(r.getFechaAcordada());
        assertThat(r.getFecha2()).isNull();
    }

    @Test
    @DisplayName("la precarga tiene 15 interesados en las 7 etapas y 4 citas, sin celulares")
    void filasDeLaPrecarga() {
        assertThat(InteresSeeder.FILAS).hasSize(15);
        assertThat(InteresSeeder.FILAS.stream().map(InteresSeeder.Fila::etapa).distinct().count())
                .isEqualTo(EtapaInteres.values().length);
        assertThat(InteresSeeder.FILAS).allSatisfy(f -> assertThat(f.correo()).endsWith("@example.com"));
        assertThat(InteresSeeder.CITAS).hasSize(4);
    }

    @Test
    @DisplayName("rangos de presupuesto por moneda, con el máximo o, si falta, el mínimo")
    void rangos() {
        Interes i = new Interes();
        assertThat(InteresService.rangoPresupuesto(i).clave()).isEqualTo("SIN_PRESUPUESTO");
        i.setMoneda("PEN");
        i.setPresupuestoMin(new BigDecimal("30000"));
        assertThat(InteresService.rangoPresupuesto(i).clave()).isEqualTo("PEN_40");
        i.setPresupuestoMax(new BigDecimal("90000"));
        assertThat(InteresService.rangoPresupuesto(i).clave()).isEqualTo("PEN_150");
        i.setPresupuestoMax(new BigDecimal("200000"));
        assertThat(InteresService.rangoPresupuesto(i).clave()).isEqualTo("PEN_MAS");
        i.setMoneda("USD");
        assertThat(InteresService.rangoPresupuesto(i).clave()).isEqualTo("USD_MAS");
        i.setPresupuestoMax(new BigDecimal("25000"));
        assertThat(InteresService.rangoPresupuesto(i).clave()).isEqualTo("USD_30");
    }
}
