package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 2): el catálogo público con 1000 lotes. El generador de carga (GeneradorCarga, fuera de la semilla normal)
 * crea 1000 lotes ficticios publicados además de los de la demostración. Cada consulta debe responder en menos de 2 s en
 * local; los tiempos se escriben en la salida de la prueba. Mide el servidor (MockMvc), sin red.
 */
@TestPropertySource(properties = {"app.carga.lotes=1000",
        "spring.datasource.url=jdbc:h2:mem:carga-${random.uuid};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;"
                + "DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1"})
class CargaCatalogoTest extends BaseApiTest {
    static final long LIMITE_MS = 2000;
    final List<String> tiempos = new ArrayList<>();

    JsonNode medir(String nombre, String... parametros) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/v1/publico/inmuebles");
        for (int i = 0; i < parametros.length; i += 2) req.param(parametros[i], parametros[i + 1]);
        long t0 = System.nanoTime();
        String r = mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        System.out.println("[CARGA] " + nombre + ": " + ms + " ms");
        assertThat(ms).as(nombre).isLessThan(LIMITE_MS);
        return json.readTree(r);
    }

    @Test
    @DisplayName("Con 1000 lotes el catálogo, con filtros y orden, responde en menos de 2 s")
    void milLotes() throws Exception {
        // v1.0 (etapa 3a): los casos publicados más los lotes de proyecto que se ofrecen.
        int publicados = ofrecidosEnCatalogo();
        assertThat(publicados).isGreaterThanOrEqualTo(1000);

        // La primera consulta es la «en frío»: sin caché ni JIT calentado.
        JsonNode p = medir("primera página, sin filtros (en frío)");
        assertThat(p.get("total").asInt()).isEqualTo(publicados);
        assertThat(p.get("items")).hasSize(24);
        assertThat(p.get("totalPaginas").asInt()).isEqualTo((publicados + 23) / 24);
        medir("primera página, sin filtros");
        assertThat(medir("última página", "pagina", String.valueOf(p.get("totalPaginas").asInt() - 1)).get("items"))
                .isNotEmpty();

        JsonNode viviendas = medir("indicador A VERDE", "indicadorA", "VERDE");
        assertThat(viviendas.get("total").asInt()).isPositive();
        for (JsonNode i : viviendas.get("items")) assertThat(i.get("estado").asString()).isEqualTo("VERDE");

        JsonNode porAlerta = medir("tipo de alerta de las reglas, ordenado por precio por m²", "tipoAlerta",
                "INFORMACION_INSUFICIENTE", "orden", "precioM2");
        assertThat(porAlerta.get("total").asInt()).isPositive();

        JsonNode combinado = medir("proyecto + distrito + precio + área + estado comercial, por área",
                "tipo", "LOTE", "estadoComercial", "DISPONIBLE", "moneda", "PEN", "precioMax", "250000", "areaMin", "150",
                "areaMax", "350", "indicadorA", "AMARILLO", "orden", "area", "sentido", "desc");
        List<java.math.BigDecimal> areas = combinado.get("items").findValues("areaM2").stream()
                .map(JsonNode::decimalValue).toList();
        assertThat(areas).isSortedAccordingTo(java.util.Comparator.reverseOrder());

        JsonNode porPrecio = medir("orden por precio descendente, página 3", "orden", "precio", "sentido", "desc", "moneda",
                "PEN", "pagina", "2");
        assertThat(porPrecio.get("items")).hasSize(24);
        JsonNode proyecto = medir("un proyecto", "proyecto", "Valle Verde");
        assertThat(proyecto.get("total").asInt()).isBetween(20, 120);
        // El filtro sobre 1000 lotes coincide con contar en la base.
        int enBase = jdbc.queryForObject("select count(*) from caso_lote where estado_publicacion = 'PUBLICADO' "
                + "and lower(proyecto) = 'valle verde'", Integer.class);
        assertThat(proyecto.get("total").asInt()).isEqualTo(enBase);
    }

    @Test
    @DisplayName("El generador es idempotente y no toca los casos de la demostración")
    void generadorIdempotente() {
        int generados = jdbc.queryForObject("select count(*) from caso_lote where codigo like 'SIM-9%'", Integer.class);
        assertThat(generados).isEqualTo(1000);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo like 'SIM-9%' "
                + "and (propietario_codigo is null or autorizacion_fecha is null)", Integer.class)).isZero();
        // Nada de datos personales: solo la empresa inventada.
        assertThat(jdbc.queryForObject("select count(*) from asiento where titulares like '%Inmobiliaria Arenales del Sur%'",
                Integer.class)).isEqualTo(1000);
    }
}
