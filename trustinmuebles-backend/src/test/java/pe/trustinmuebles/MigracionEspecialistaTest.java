package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * La migración V9 sobre una base existente: cambia el perfil de especialista-01 y los informes firmados con él, sin tocar
 * otros perfiles ni informes. Usa su propia base H2 en memoria, nueva en cada ejecución; no toca data/.
 */
class MigracionEspecialistaTest {
    static final String NOMBRE_ANTERIOR = "Ing. Carlos Alberto Mendoza Quispe";
    static final String COLEGIATURA_ANTERIOR = "CIP N.° 248910";

    @Test
    @DisplayName("V9 reemplaza el perfil anterior en la cuenta y en los informes firmados, y deja lo demás intacto")
    void reemplazaElPerfilAnterior() {
        SingleConnectionDataSource ds = new SingleConnectionDataSource("jdbc:h2:mem:migracion-" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "sa", "", true);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("8").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en, nombre_completo, colegiatura) "
                + "values ('especialista-01', '$2a$10$x', 'ESPECIALISTA', current_timestamp, ?, ?)",
                NOMBRE_ANTERIOR, COLEGIATURA_ANTERIOR);
        jdbc.update("insert into usuario (codigo_cuenta, password_hash, rol, creado_en, nombre_completo, colegiatura) "
                + "values ('especialista-02', '$2a$10$x', 'ESPECIALISTA', current_timestamp, 'Arq. Perfil Ficticio 02', "
                + "'SIM-CAP-0002')");
        Long revisor = jdbc.queryForObject("select min(id) from usuario", Long.class);
        for (String c : new String[] {"SIM-1", "SIM-2"}) {
            jdbc.update("insert into caso_lote (codigo, denominacion, contexto, sintetico, responsable_id) "
                    + "values (?, ?, 'Ica, Ica', true, ?)", c, "Predio " + c, revisor);
            jdbc.update("insert into expediente (caso_id, condicion_representada, titularidad, completitud, "
                    + "fecha_referencial, actualizado_en) select id, 'Lote', 'desconocido', 'COMPLETA', date '2026-10-17', "
                    + "current_timestamp from caso_lote where codigo = ?", c);
        }
        String informe = "insert into evaluacion_tecnica (expediente_id, estado, profesional, colegiatura, actualizado_en) "
                + "select e.id, 'EMITIDO', ?, ?, current_timestamp from expediente e join caso_lote c on c.id = e.caso_id "
                + "where c.codigo = ?";
        jdbc.update(informe, NOMBRE_ANTERIOR, COLEGIATURA_ANTERIOR, "SIM-1");
        jdbc.update(informe, "Arq. Perfil Ficticio 02", "SIM-CAP-0002", "SIM-2");

        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("9").load().migrate();

        assertThat(jdbc.queryForObject("select nombre_completo || ' | ' || colegiatura from usuario "
                + "where codigo_cuenta = 'especialista-01'", String.class))
                .isEqualTo("Ing. Perfil Ficticio 01 | CIP N.° SIM-CIP-0001");
        assertThat(jdbc.queryForObject("select nombre_completo from usuario where codigo_cuenta = 'especialista-02'",
                String.class)).isEqualTo("Arq. Perfil Ficticio 02");
        assertThat(jdbc.queryForList("select profesional || ' | ' || colegiatura from evaluacion_tecnica order by id",
                String.class)).containsExactly("Ing. Perfil Ficticio 01 | CIP N.° SIM-CIP-0001",
                        "Arq. Perfil Ficticio 02 | SIM-CAP-0002");
        assertThat(jdbc.queryForObject("select count(*) from evaluacion_tecnica where colegiatura = ?", Integer.class,
                COLEGIATURA_ANTERIOR)).isZero();
    }
}
