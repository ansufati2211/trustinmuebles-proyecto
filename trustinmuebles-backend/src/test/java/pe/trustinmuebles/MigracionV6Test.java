package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * La migración V6 sobre una base v0.6 ya poblada: conserva los diez casos, los deja publicados con autorización y
 * repartidos entre los dos propietarios. Usa su propia base H2 en memoria, nueva en cada ejecución; no toca data/.
 */
class MigracionV6Test {
    static final List<String> CASOS = List.of("SIM-11048217", "SIM-11052690", "SIM-11061555", "SIM-11070419",
            "SIM-11075836", "SIM-11081204", "SIM-11087751", "SIM-11093320", "SIM-11098467", "SIM-11104029");

    @Test
    @DisplayName("V6 conserva los diez casos de una base existente, publicados, autorizados y repartidos 5 y 5")
    void conservaLosDiezCasos() {
        SingleConnectionDataSource ds = new SingleConnectionDataSource("jdbc:h2:mem:migracion-" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "sa", "", true);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("5").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en) "
                + "values ('revisor-01', '$2a$10$x', 'REVISOR', current_timestamp)");
        Long revisor = jdbc.queryForObject("select id from usuario", Long.class);
        for (String c : CASOS) {
            jdbc.update("insert into caso_lote (codigo, denominacion, contexto, sintetico, responsable_id, distrito) "
                    + "values (?, ?, 'Ica, Ica', true, ?, 'Ica')", c, "Predio " + c, revisor);
            jdbc.update("insert into expediente (caso_id, condicion_representada, titularidad, completitud, "
                    + "fecha_referencial, actualizado_en) select id, 'Lote', 'desconocido', 'COMPLETA', date '2026-10-17', "
                    + "current_timestamp from caso_lote where codigo = ?", c);
        }
        jdbc.update("insert into caso_lote (codigo, denominacion, contexto, sintetico, origen, fuente, fecha_consulta, "
                + "sin_datos_personales, responsable_id) values ('11012345', 'Transcrita', 'Ica, Ica', false, 'TRANSCRITA', "
                + "'Conoce Aquí – SUNARP', date '2026-10-17', true, ?)", revisor);

        Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();

        assertThat(jdbc.queryForObject("select count(*) from caso_lote where sintetico = true", Integer.class))
                .isEqualTo(10);
        assertThat(jdbc.queryForObject("select count(*) from expediente", Integer.class)).isEqualTo(10);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where sintetico = true "
                + "and estado_publicacion = 'PUBLICADO' and autorizacion_fecha is not null", Integer.class)).isEqualTo(10);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where propietario_codigo = 'propietario-01'",
                Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where propietario_codigo = 'propietario-02'",
                Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("select denominacion from caso_lote where codigo = 'SIM-11048217'", String.class))
                .as("los datos existentes no se pierden").isEqualTo("Predio SIM-11048217");
        // Una transcrita anterior queda en borrador y sin autorización: no se publica sola.
        assertThat(jdbc.queryForObject("select estado_publicacion from caso_lote where codigo = '11012345'", String.class))
                .isEqualTo("BORRADOR");

        // I14 también en la base: no se puede dejar publicado un caso sin autorización.
        assertThatThrownBy(() -> jdbc.update(
                "update caso_lote set autorizacion_fecha = null where codigo = 'SIM-11048217'"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        // Los nuevos roles son válidos.
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en) "
                + "values ('gestor-01', '$2a$10$x', 'GESTOR', current_timestamp)");
    }
}
