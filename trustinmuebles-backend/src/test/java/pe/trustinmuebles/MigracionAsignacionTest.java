package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * La migración V10 sobre una base existente: asigna solo la inspección en curso de la demostración. Usa su propia base H2
 * en memoria, nueva en cada ejecución; no toca data/.
 */
class MigracionAsignacionTest {

    @Test
    @DisplayName("V10 asigna especialista-01 a SIM-11098467 en curso; la solicitada y las otras en curso quedan sin asignar")
    void asignaLaInspeccionEnCurso() {
        SingleConnectionDataSource ds = new SingleConnectionDataSource("jdbc:h2:mem:migracion-" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "sa", "", true);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("9").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en) "
                + "values ('revisor-01', '$2a$10$x', 'REVISOR', current_timestamp)");
        Long revisor = jdbc.queryForObject("select id from usuario", Long.class);
        String[][] casos = {{"SIM-11098467", "EN_INSPECCION"}, {"SIM-11093320", "SOLICITADA"}, {"SIM-99000404", "EN_INSPECCION"}};
        for (String[] c : casos) {
            jdbc.update("insert into caso_lote (codigo, denominacion, contexto, sintetico, responsable_id) "
                    + "values (?, ?, 'Ica, Ica', true, ?)", c[0], "Predio " + c[0], revisor);
            jdbc.update("insert into expediente (caso_id, condicion_representada, titularidad, completitud, "
                    + "fecha_referencial, actualizado_en) select id, 'Lote', 'desconocido', 'COMPLETA', date '2026-10-17', "
                    + "current_timestamp from caso_lote where codigo = ?", c[0]);
            jdbc.update("insert into evaluacion_tecnica (expediente_id, estado, actualizado_en) select e.id, ?, "
                    + "current_timestamp from expediente e join caso_lote l on l.id = e.caso_id where l.codigo = ?", c[1], c[0]);
        }

        Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();

        String asignado = "select t.especialista_asignado_codigo from evaluacion_tecnica t join expediente e "
                + "on e.id = t.expediente_id join caso_lote l on l.id = e.caso_id where l.codigo = ?";
        assertThat(jdbc.queryForObject(asignado, String.class, "SIM-11098467")).isEqualTo("especialista-01");
        assertThat(jdbc.queryForObject(asignado, String.class, "SIM-11093320")).isNull();
        assertThat(jdbc.queryForObject(asignado, String.class, "SIM-99000404")).isNull();
    }
}
