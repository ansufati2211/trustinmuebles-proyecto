package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * v1.0 (etapa 6): la migración V22 sobre una base existente deja sin colegiatura a los especialistas y a los informes
 * guardados, sin tocar sus nombres ni a las demás cuentas, y crea la tabla de ajustes de contenido. Base H2 propia.
 */
class MigracionRealismoTest {

    @Test
    @DisplayName("V22 vacía la colegiatura de los especialistas y de los informes, y crea ajuste_contenido")
    void vaciaLaColegiatura() {
        SingleConnectionDataSource ds = new SingleConnectionDataSource("jdbc:h2:mem:migracion-v22-" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "sa", "", true);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("21").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en, nombre_completo, especialidad, "
                + "colegiatura) values ('especialista-01', '$2a$10$x', 'ESPECIALISTA', current_timestamp, "
                + "'Ing. Nombre Inventado', 'Ingeniero Civil', 'CIP N.° 000000')");
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en) "
                + "values ('revisor-01', '$2a$10$x', 'REVISOR', current_timestamp)");
        Long revisor = jdbc.queryForObject("select id from usuario where codigo_cuenta = 'revisor-01'", Long.class);
        jdbc.update("insert into caso_lote (codigo, denominacion, contexto, sintetico, responsable_id) "
                + "values ('11000001', 'Predio', 'Ica, Ica', true, ?)", revisor);
        jdbc.update("insert into expediente (caso_id, condicion_representada, titularidad, completitud, "
                + "fecha_referencial, actualizado_en) select id, 'Lote', 'desconocido', 'COMPLETA', date '2026-10-17', "
                + "current_timestamp from caso_lote where codigo = '11000001'");
        jdbc.update("insert into evaluacion_tecnica (expediente_id, estado, profesional, colegiatura, actualizado_en) "
                + "select id, 'EMITIDO', 'Ing. Nombre Inventado', 'CIP N.° 000000', current_timestamp from expediente");

        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("22").load().migrate();

        assertThat(jdbc.queryForObject("select nombre_completo || ' | ' || especialidad || ' | ' || "
                + "coalesce(colegiatura, 'vacía') from usuario where codigo_cuenta = 'especialista-01'", String.class))
                .isEqualTo("Ing. Nombre Inventado | Ingeniero Civil | vacía");
        assertThat(jdbc.queryForObject("select profesional || ' | ' || coalesce(colegiatura, 'vacía') "
                + "from evaluacion_tecnica", String.class)).isEqualTo("Ing. Nombre Inventado | vacía");
        assertThat(jdbc.queryForObject("select count(*) from usuario where codigo_cuenta = 'revisor-01'", Integer.class))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from ajuste_contenido", Integer.class)).isZero();
    }
}
