package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** v1.0 (etapa 3b): la migración V20 agrega el historial de lotes sin tocar los proyectos ni los lotes que ya hay. */
class MigracionHistorialLotesTest {
    @Test
    @DisplayName("V20 solo agrega la tabla del historial: los proyectos y lotes existentes quedan intactos")
    void esAditiva() {
        SingleConnectionDataSource ds = new SingleConnectionDataSource("jdbc:h2:mem:migracion-" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "sa", "", true);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("19").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.update("insert into proyecto (codigo, nombre, distrito) values ('p', 'P', 'Ica')");
        jdbc.update("insert into lote_proyecto (proyecto_id, manzana, numero, area_m2) select id, 'A', 1, 120 from proyecto");

        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("20").load().migrate();

        assertThat(jdbc.queryForObject("select count(*) from proyecto", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select area_m2 from lote_proyecto", java.math.BigDecimal.class)).isEqualByComparingTo("120");
        assertThat(jdbc.queryForObject("select count(*) from historial_lote_proyecto", Integer.class)).isZero();
        jdbc.update("insert into historial_lote_proyecto (proyecto_codigo, lote_clave, accion, origen, cambios, carga_id, "
                + "cuenta_codigo, registrada_en) values ('p', 'A-1', 'CREADO', 'CSV', 'area_m2: 120.00', 'x', 'asesor-01', current_timestamp)");
        assertThatThrownBy(() -> jdbc.update("insert into historial_lote_proyecto (proyecto_codigo, lote_clave, accion, origen, "
                + "cambios, carga_id, cuenta_codigo, registrada_en) values ('p', 'A-1', 'BORRADO', 'CSV', 'x', 'x', 'u', current_timestamp)"))
                .hasMessageContaining("ck_hist_lote_accion");
    }
}
