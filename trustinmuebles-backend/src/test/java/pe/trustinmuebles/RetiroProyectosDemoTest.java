package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ApplicationContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 10): con {@code app.proyectos.retirados} (lo que usa la app fuera de las pruebas), Rinconada del Lúcumo,
 * Terrazas de Sauzal y Horizonte de Los Aquijes salen del portal: se retira la autorización de su partida matriz una sola
 * vez por base, sin borrar lotes, casos ni interesados. Altos de Ventisca y las casas siguen en el catálogo.
 */
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:retiro-${random.uuid};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;"
                + "DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
        "app.proyectos.retirados=rinconada-del-lucumo, terrazas-de-sauzal,horizonte-de-los-aquijes"})
class RetiroProyectosDemoTest extends BaseApiTest {
    static final List<String> RETIRADOS = List.of("rinconada-del-lucumo", "terrazas-de-sauzal", "horizonte-de-los-aquijes");
    static final String[] SUS_MATRICES = {MATRIZ_LUCUMO, MATRIZ_SAUZAL, MATRIZ_AQUIJES};

    @Autowired ApplicationContext contexto;

    JsonNode publico(String ruta) throws Exception {
        return json.readTree(mvc.perform(get(ruta)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    int retiradasDe(String caso) {
        return jdbc.queryForObject("select count(*) from historial_autorizacion where caso_codigo = ? and accion = 'RETIRADA'",
                Integer.class, caso);
    }

    void arrancarOtraVez() throws Exception {
        for (ApplicationRunner r : contexto.getBeansOfType(ApplicationRunner.class).values()) {
            if (org.springframework.aop.support.AopUtils.getTargetClass(r).getSimpleName().equals("RetiroProyectosDemo")) {
                r.run(org.mockito.Mockito.mock(ApplicationArguments.class));
                return;
            }
        }
        throw new AssertionError("No está RetiroProyectosDemo");
    }

    @Test
    @DisplayName("Los tres proyectos retirados no se ven en el portal; Altos de Ventisca y las casas, sí")
    void fueraDelPortal() throws Exception {
        for (String codigo : RETIRADOS) {
            mvc.perform(get("/api/v1/publico/proyectos/" + codigo)).andExpect(status().isNotFound());
        }
        assertThat(publico("/api/v1/publico/inmuebles?proyecto=Rinconada del Lúcumo").get("total").asInt()).isZero();
        assertThat(publico("/api/v1/publico/inmuebles?proyecto=Terrazas de Sauzal").get("total").asInt()).isZero();
        mvc.perform(get("/api/v1/publico/proyectos/altos-de-ventisca")).andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes.length()").value(56));
        // Las casas (también C1–C4 del estudio) siguen en el catálogo.
        for (String caso : new String[] {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES}) {
            mvc.perform(get("/api/v1/publico/inmuebles/" + caso)).andExpect(status().isOk());
        }
        // El selector de proyectos y las cifras de la portada solo cuentan Altos de Ventisca (Sol de Carhuaz y Vista Alegre
        // todavía no tienen lotes).
        JsonNode filtros = publico("/api/v1/publico/filtros");
        assertThat(filtros.get("proyectos")).extracting(JsonNode::asString).containsExactly("Altos de Ventisca");
        assertThat(publico("/api/v1/publico/sitio").get("cifras").get("proyectos").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("No se borra nada: los lotes siguen en el panel, la autorización se retira con su fila en el historial")
    void sinBorrar() throws Exception {
        for (String matriz : SUS_MATRICES) {
            Map<String, Object> c = jdbc.queryForMap("select autorizacion_fecha, estado_publicacion from caso_lote where codigo = ?", matriz);
            assertThat(c.get("autorizacion_fecha")).as(matriz).isNull();
            assertThat(c.get("estado_publicacion")).as(matriz).isEqualTo("BORRADOR");
            assertThat(retiradasDe(matriz)).as(matriz).isEqualTo(1);
            assertThat(jdbc.queryForObject("select cuenta_codigo from historial_autorizacion where caso_codigo = ? "
                    + "and accion = 'RETIRADA'", String.class, matriz)).isEqualTo("asesor-01");
        }
        assertThat(jdbc.queryForObject("select autorizacion_fecha from caso_lote where codigo = ?", Object.class,
                MATRIZ_VENTISCA)).as("Altos de Ventisca no se toca").isNotNull();
        JsonNode panel = json.readTree(mvc.perform(get("/api/v1/proyectos").header("Authorization", token("asesor-01")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode p : panel) {
            String codigo = p.get("codigo").asString();
            if (codigo.equals("rinconada-del-lucumo")) assertThat(p.get("lotes").asInt()).isEqualTo(44);
            if (codigo.equals("terrazas-de-sauzal")) assertThat(p.get("lotes").asInt()).isEqualTo(68);
            if (RETIRADOS.contains(codigo)) {
                assertThat(p.get("autorizacionVigente").asBoolean()).as(codigo).isFalse();
                assertThat(p.get("publicados").asInt()).as(codigo).isZero();
            }
        }
        // Los 15 interesados precargados siguen, con su proyecto (se precargan antes del retiro).
        assertThat(jdbc.queryForObject("select count(*) from interes", Integer.class)).isEqualTo(15);
        assertThat(jdbc.queryForObject("select count(*) from interes where proyecto_codigo in ('rinconada-del-lucumo', "
                + "'terrazas-de-sauzal')", Integer.class)).isEqualTo(8);
    }

    @Test
    @DisplayName("Una sola vez por base: arrancar otra vez no duplica, y si el equipo vuelve a autorizar, no se retira de nuevo")
    void unaSolaVez() throws Exception {
        arrancarOtraVez();
        for (String matriz : SUS_MATRICES) assertThat(retiradasDe(matriz)).as(matriz).isEqualTo(1);
        jdbc.update("update caso_lote set autorizacion_fecha = current_timestamp where codigo = ?", MATRIZ_LUCUMO);
        arrancarOtraVez();
        assertThat(jdbc.queryForObject("select autorizacion_fecha from caso_lote where codigo = ?", Object.class,
                MATRIZ_LUCUMO)).isNotNull();
        assertThat(retiradasDe(MATRIZ_LUCUMO)).isEqualTo(1);
        mvc.perform(get("/api/v1/publico/proyectos/rinconada-del-lucumo")).andExpect(status().isOk());
        jdbc.update("update caso_lote set autorizacion_fecha = null where codigo = ?", MATRIZ_LUCUMO);
    }

    @Test
    @DisplayName("Cargar el CSV del kit en Horizonte de Los Aquijes crea los lotes pero no los ofrece; Sol de Carhuaz sí")
    void cargaEnRetirado() throws Exception {
        Path kit = Path.of("..", "docs", "demo", "kit");
        String asesor = token("asesor-01");
        mvc.perform(multipart("/api/v1/proyectos/horizonte-de-los-aquijes/lotes/carga")
                        .file(new MockMultipartFile("archivo", "l.csv", "text/csv", Files.readAllBytes(kit.resolve("proyecto-nuevo-80-lotes.csv"))))
                        .header("Authorization", asesor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(80));
        mvc.perform(get("/api/v1/publico/proyectos/horizonte-de-los-aquijes")).andExpect(status().isNotFound());
        mvc.perform(multipart("/api/v1/proyectos/sol-de-carhuaz-iv-etapa/lotes/carga")
                        .file(new MockMultipartFile("archivo", "l.csv", "text/csv", Files.readAllBytes(kit.resolve("sol-de-carhuaz-iv-etapa-lotes.csv"))))
                        .header("Authorization", asesor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(214));
        mvc.perform(get("/api/v1/publico/proyectos/sol-de-carhuaz-iv-etapa")).andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes.length()").value(214));
        assertThat(publico("/api/v1/publico/filtros").get("proyectos")).extracting(JsonNode::asString)
                .containsExactly("Altos de Ventisca", "Sol de Carhuaz – IV etapa");
        jdbc.update("delete from lote_proyecto where proyecto_id in (select id from proyecto where codigo in "
                + "('horizonte-de-los-aquijes', 'sol-de-carhuaz-iv-etapa'))");
        jdbc.update("delete from historial_lote_proyecto");
    }
}
