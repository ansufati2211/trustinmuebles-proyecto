package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * v1.0 (etapa 3a): la migración V19 sobre una base existente convierte el texto «proyecto» de cada caso (V18) en una
 * referencia a un proyecto, sin perder el texto ni duplicar proyectos. Base H2 propia, nueva en cada ejecución.
 */
class MigracionProyectosTest {

    @Test
    @DisplayName("V19 crea un proyecto por nombre distinto, vincula cada caso por código y conserva el texto")
    void migraElTextoALaReferencia() {
        SingleConnectionDataSource ds = new SingleConnectionDataSource("jdbc:h2:mem:migracion-" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "sa", "", true);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("18").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en) "
                + "values ('revisor-01', '$2a$10$x', 'REVISOR', current_timestamp)");
        Long revisor = jdbc.queryForObject("select min(id) from usuario", Long.class);
        String[][] casos = {{"SIM-1", "Campiña del Olivar", "Santiago"}, {"SIM-2", "campiña del olivar", "Santiago"},
                {"SIM-3", "Santa Elvira", "Parcona"}, {"SIM-4", null, "Huarmey"}, {"SIM-5", "  ", "Ica"},
                {"SIM-6", "Ñaña Úrsula 2", "Ica"}};
        for (String[] c : casos) {
            jdbc.update("insert into caso_lote (codigo, denominacion, contexto, sintetico, responsable_id, proyecto, "
                    + "distrito) values (?, ?, 'Ica, Ica', true, ?, ?, ?)", c[0], "Predio " + c[0], revisor, c[1], c[2]);
        }

        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("19").load().migrate();

        assertThat(jdbc.queryForList("select codigo from proyecto order by codigo", String.class))
                .containsExactly("campina-del-olivar", "nana-ursula-2", "santa-elvira");
        assertThat(jdbc.queryForObject("select distrito from proyecto where codigo = 'santa-elvira'", String.class))
                .isEqualTo("Parcona");
        assertThat(jdbc.queryForList("select codigo || '=' || coalesce(proyecto_codigo, '-') from caso_lote order by codigo",
                String.class)).containsExactly("SIM-1=campina-del-olivar", "SIM-2=campina-del-olivar",
                        "SIM-3=santa-elvira", "SIM-4=-", "SIM-5=-", "SIM-6=nana-ursula-2");
        // El texto no se pierde: sigue siendo el nombre que se muestra.
        assertThat(jdbc.queryForObject("select proyecto from caso_lote where codigo = 'SIM-2'", String.class))
                .isEqualTo("campiña del olivar");
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where creado_en is null", Integer.class)).isZero();
        // El código que calcula Java es el mismo que el de la migración.
        for (String nombre : new String[] {"Campiña del Olivar", "Santa Elvira", "Ñaña Úrsula 2"}) {
            assertThat(jdbc.queryForObject("select count(*) from proyecto where codigo = ?", Integer.class,
                    pe.trustinmuebles.expediente.CodigoProyecto.de(nombre))).isEqualTo(1);
        }
    }
}
