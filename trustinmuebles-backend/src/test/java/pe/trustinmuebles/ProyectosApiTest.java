package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import pe.trustinmuebles.expediente.CodigoProyecto;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 3a): proyectos, plano de lotes y catálogo unido. Base H2 propia porque retira y vuelve a registrar la
 * autorización de una partida matriz, publica y retira lotes y cambia estados comerciales (todo se restaura).
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:proyectos-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class ProyectosApiTest extends BaseApiTest {
    static final String VENTISCA = "altos-de-ventisca";
    static final String LUCUMO = "rinconada-del-lucumo";
    static final String SAUZAL = "terrazas-de-sauzal";
    static final String ROTULO_MATRIZ = "Indicador A de la partida matriz del proyecto";

    JsonNode leerJson(MockHttpServletRequestBuilder req) throws Exception {
        return json.readTree(mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    JsonNode proyecto(String codigo) throws Exception {
        return leerJson(get("/api/v1/publico/proyectos/" + codigo));
    }

    JsonNode lista(String... parametros) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/v1/publico/inmuebles");
        for (int i = 0; i < parametros.length; i += 2) req.param(parametros[i], parametros[i + 1]);
        return leerJson(req);
    }

    /** Todos los items del catálogo (todas las páginas). */
    List<JsonNode> todos(String... parametros) throws Exception {
        List<JsonNode> salida = new ArrayList<>();
        for (int p = 0;; p++) {
            String[] con = java.util.Arrays.copyOf(parametros, parametros.length + 2);
            con[parametros.length] = "pagina";
            con[parametros.length + 1] = String.valueOf(p);
            JsonNode pagina = lista(con);
            pagina.get("items").forEach(salida::add);
            if (p + 1 >= pagina.get("totalPaginas").asInt()) return salida;
        }
    }

    List<String> codigos(List<JsonNode> items) {
        return items.stream().map(i -> i.get("codigo").asString()).sorted().toList();
    }

    void igualA(String[] parametros, Predicate<JsonNode> condicion) throws Exception {
        List<String> esperado = codigos(todos().stream().filter(condicion).toList());
        List<JsonNode> obtenido = todos(parametros);
        assertThat(lista(parametros).get("total").asInt()).isEqualTo(esperado.size());
        assertThat(codigos(obtenido)).isEqualTo(esperado);
    }

    static BigDecimal d(JsonNode n, String campo) {
        return n.get("predio").hasNonNull(campo) ? n.get("predio").get(campo).decimalValue() : null;
    }

    int historial() {
        return jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class);
    }

    // ------------------------------------------------------------------ precarga

    @Test
    @DisplayName("Precarga: tres proyectos inventados en Subtanjalla, La Tinguiña y Salas, de 40 a 70 lotes, con 60/25/15 %")
    void precarga() throws Exception {
        Map<String, String> distritos = Map.of(VENTISCA, "Subtanjalla", LUCUMO, "La Tinguiña", SAUZAL, "Salas");
        JsonNode precios = json.readTree(new ClassPathResource("contenido/precios-zona.json").getInputStream());
        for (var e : distritos.entrySet()) {
            JsonNode p = proyecto(e.getKey());
            assertThat(p.get("distrito").asString()).isEqualTo(e.getValue());
            assertThat(p.get("nombre").asString()).doesNotContainIgnoringCase("carhuaz").doesNotContainIgnoringCase("palma");
            assertThat(p.get("descripcion").asString()).isNotBlank();
            int n = p.get("lotes").size();
            assertThat(n).isBetween(40, 70);
            Map<String, Integer> estados = new HashMap<>();
            int conZonificacion = 0;
            BigDecimal porM2 = precios.get("precioPorM2").get(e.getValue()).decimalValue();
            for (JsonNode l : p.get("lotes")) {
                estados.merge(l.get("estadoComercial").asString(), 1, Integer::sum);
                if (l.hasNonNull("zonificacion")) conZonificacion++;
                assertThat(l.get("publicado").asBoolean()).isTrue();
                // Precio = área × precio por m² del distrito, redondeado a la centena.
                BigDecimal esperado = l.get("areaM2").decimalValue().multiply(porM2)
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
                assertThat(l.get("precio").decimalValue()).as(l.get("codigo").asString()).isEqualByComparingTo(esperado);
                assertThat(l.get("moneda").asString()).isEqualTo("PEN");
            }
            assertThat(estados.get("VENDIDO")).isEqualTo(Math.round(n * 0.15f));
            assertThat(estados.get("SEPARADO")).isEqualTo(Math.round(n * 0.25f));
            assertThat(estados.get("DISPONIBLE")).isEqualTo(n - estados.get("VENDIDO") - estados.get("SEPARADO"));
            assertThat(estados.get("DISPONIBLE") * 1.0 / n).isBetween(0.55, 0.65);
            assertThat(conZonificacion).as("zonificación en parte de los lotes").isBetween(1, n - 1);
            assertThat(p.get("conteo").get("disponibles").asInt()).isEqualTo(estados.get("DISPONIBLE"));
            assertThat(p.get("hitos").size()).isGreaterThanOrEqualTo(5);
            assertThat(p.get("hitos").toString()).contains("COMPLETADO", "PENDIENTE").doesNotContainIgnoringCase("saneamiento");
            // Partida matriz: caso nuevo con sus 4 documentos generados.
            assertThat(p.get("documentos")).hasSize(4);
            for (JsonNode doc : p.get("documentos")) {
                assertThat(doc.get("estado").asString()).isEqualTo("PRESENTADO");
                assertThat(doc.get("disponible").asBoolean()).isTrue();
            }
            assertThat(p.get("recorridoUrl").isNull()).as("sin video inventado").isTrue();
        }
        // Las partidas matrices dan el color de las reglas: dos verdes y una amarilla (hipoteca vigente, RV-02).
        assertThat(proyecto(VENTISCA).get("indicadorA").get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
        assertThat(proyecto(SAUZAL).get("indicadorA").get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
        JsonNode lucumo = proyecto(LUCUMO).get("indicadorA");
        assertThat(lucumo.get("evaluacion").get("estado").asString()).isEqualTo("AMARILLO");
        assertThat(lucumo.get("evaluacion").get("reglasAplicadas").toString()).contains("RV-02");
        assertThat(lucumo.get("rotulo").asString()).isEqualTo(ROTULO_MATRIZ);
        assertThat(lucumo.get("casoCodigo").asString()).isEqualTo(MATRIZ_LUCUMO);
        // Sin datos personales: titulares inventados.
        assertThat(jdbc.queryForList("select titulares from asiento a join expediente e on e.id = a.expediente_id "
                + "join caso_lote c on c.id = e.caso_id where c.codigo in ('11112001','11112002','11112003') "
                + "and titulares is not null", String.class)).allMatch(t -> t.contains("S.A.C."));
    }

    @Test
    @DisplayName("Los casos quedan vinculados a su proyecto por código, sin perder el texto")
    void vinculoPorCodigo() {
        List<Map<String, Object>> filas = jdbc.queryForList(
                "select codigo, proyecto, proyecto_codigo from caso_lote where proyecto is not null");
        assertThat(filas).isNotEmpty();
        for (Map<String, Object> f : filas) {
            String codigo = CodigoProyecto.de((String) f.get("proyecto"));
            assertThat(f.get("proyecto_codigo")).as((String) f.get("codigo")).isEqualTo(codigo);
            assertThat(jdbc.queryForObject("select count(*) from proyecto where codigo = ?", Integer.class, codigo))
                    .isEqualTo(1);
        }
        assertThat(jdbc.queryForObject("select proyecto_codigo from caso_lote where codigo = ?", String.class, SANTIAGO))
                .isEqualTo("campina-del-olivar");
        assertThat(jdbc.queryForObject("select caso_matriz_codigo from proyecto where codigo = ?", String.class, LUCUMO))
                .isEqualTo(MATRIZ_LUCUMO);
        assertThat(jdbc.queryForObject("select proyecto_codigo from caso_lote where codigo = ?", String.class,
                MATRIZ_LUCUMO)).isEqualTo(LUCUMO);
        // Sin texto, sin referencia (los lotes de la SBN).
        assertThat(jdbc.queryForObject("select proyecto_codigo from caso_lote where codigo = ?", String.class, HUARMEY))
                .isNull();
    }

    // ------------------------------------------------------------------ catálogo unido

    @Test
    @DisplayName("El catálogo une casos y lotes de proyecto; un lote lleva el indicador A de la partida matriz, rotulado")
    void catalogoUnido() throws Exception {
        JsonNode p = lista();
        assertThat(p.get("total").asInt()).isEqualTo(ofrecidosEnCatalogo());
        List<JsonNode> items = todos();
        long casos = items.stream().filter(i -> i.get("clase").asString().equals("CASO")).count();
        long lotes = items.stream().filter(i -> i.get("clase").asString().equals("LOTE_PROYECTO")).count();
        assertThat(casos).isEqualTo(12);
        assertThat(lotes).isEqualTo(56 + 44 + 68);
        assertThat(lista("clase", "CASO").get("total").asInt()).isEqualTo(12);
        assertThat(lista("clase", "lote_proyecto").get("total").asInt()).isEqualTo(168);
        // Las partidas matrices no se ofrecen como inmuebles (borrador) ni tienen ficha pública de caso.
        assertThat(codigos(items)).doesNotContain(MATRICES);
        mvc.perform(get("/api/v1/publico/inmuebles/" + MATRIZ_VENTISCA)).andExpect(status().isNotFound());

        Map<String, String> colorMatriz = Map.of(VENTISCA, "VERDE", LUCUMO, "AMARILLO", SAUZAL, "VERDE");
        for (JsonNode i : items) {
            if (i.get("clase").asString().equals("CASO")) {
                assertThat(i.get("fuenteIndicadorA").asString()).isEqualTo("PROPIO");
                continue;
            }
            String proyecto = i.get("proyectoCodigo").asString();
            assertThat(i.get("fuenteIndicadorA").asString()).isEqualTo("PARTIDA_MATRIZ");
            assertThat(i.get("rotuloIndicadorA").asString()).isEqualTo(ROTULO_MATRIZ);
            assertThat(i.get("estado").asString()).as(i.get("codigo").asString()).isEqualTo(colorMatriz.get(proyecto));
            assertThat(i.get("codigo").asString()).isEqualTo(proyecto + "-" + i.get("lote").asString());
            assertThat(i.get("predio").get("tipoInmueble").asString()).isEqualTo("LOTE_URBANO");
            assertThat(i.get("predio").get("proyectoCodigo").asString()).isEqualTo(proyecto);
            assertThat(i.get("estadoTecnico").asString()).isEqualTo("NO_SOLICITADA");
            assertThat(i.get("titularidadComercial").asString()).isEqualTo("INMOBILIARIA");
            assertThat(i.has("gestion")).isFalse();
            assertThat(d(i, "precioPorM2")).isEqualByComparingTo(
                    d(i, "precioReferencial").divide(d(i, "areaM2"), 2, RoundingMode.HALF_UP));
        }
        String crudo = json.writeValueAsString(p);
        assertThat(crudo).doesNotContain("propietario-0").doesNotContain("asesor-0").doesNotContain("\"gestion\"");
        mvc.perform(get("/api/v1/publico/inmuebles").param("clase", "OTRA")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("clase")));
    }

    @Test
    @DisplayName("Los mismos filtros y el mismo orden valen para casos y lotes juntos")
    void filtrosSobreLaListaUnida() throws Exception {
        igualA(new String[] {"distrito", "subtanjalla"}, i -> "Subtanjalla".equalsIgnoreCase(i.get("predio").path("distrito").asString()));
        igualA(new String[] {"proyecto", "Altos de Ventisca"}, i -> VENTISCA.equals(i.path("proyectoCodigo").asString()));
        assertThat(lista("proyecto", "Altos de Ventisca").get("total").asInt()).isEqualTo(56);
        igualA(new String[] {"tipo", "LOTE"}, i -> i.get("predio").get("tipoInmueble").asString().equals("LOTE_URBANO"));
        igualA(new String[] {"estadoComercial", "VENDIDO"}, i -> i.get("predio").get("estadoComercial").asString().equals("VENDIDO"));
        assertThat(lista("estadoComercial", "VENDIDO").get("total").asInt()).isEqualTo(8 + 7 + 10);
        igualA(new String[] {"precioMin", "30000", "precioMax", "40000"}, i -> "PEN".equals(i.get("predio").path("moneda").asString())
                && d(i, "precioReferencial").compareTo(new BigDecimal("30000")) >= 0
                && d(i, "precioReferencial").compareTo(new BigDecimal("40000")) <= 0);
        igualA(new String[] {"areaMin", "150", "areaMax", "170"}, i -> d(i, "areaM2") != null
                && d(i, "areaM2").compareTo(new BigDecimal("150")) >= 0 && d(i, "areaM2").compareTo(new BigDecimal("170")) <= 0);
        igualA(new String[] {"indicadorA", "AMARILLO"}, i -> "AMARILLO".equals(i.get("estado").asString()));
        assertThat(lista("indicadorA", "AMARILLO", "proyecto", "Rinconada del Lúcumo").get("total").asInt()).isEqualTo(44);
        igualA(new String[] {"tipoAlerta", "RV-02"}, i -> i.get("tiposAlerta").toString().contains("\"RV-02\""));
        igualA(new String[] {"distrito", "Salas", "estadoComercial", "DISPONIBLE", "clase", "LOTE_PROYECTO"},
                i -> "Salas".equals(i.get("predio").path("distrito").asString()) && i.get("clase").asString().equals("LOTE_PROYECTO")
                        && i.get("predio").get("estadoComercial").asString().equals("DISPONIBLE"));

        // Orden por precio en soles: casos y lotes mezclados, de menor a mayor.
        List<BigDecimal> precios = todos("orden", "precio", "moneda", "PEN").stream()
                .map(i -> d(i, "precioReferencial")).toList();
        assertThat(precios).isSorted();
        List<BigDecimal> areas = todos("orden", "area", "sentido", "desc").stream().map(i -> d(i, "areaM2"))
                .filter(java.util.Objects::nonNull).toList();
        assertThat(areas).isSortedAccordingTo(java.util.Comparator.reverseOrder());
        // Novedad: los lotes de los proyectos se cargaron después que los casos; los dos sentidos son espejo.
        List<JsonNode> nuevos = todos();
        assertThat(nuevos.get(0).get("clase").asString()).isEqualTo("LOTE_PROYECTO");
        List<String> asc = todos("sentido", "asc").stream().map(i -> i.get("codigo").asString()).toList();
        assertThat(asc).isEqualTo(nuevos.stream().map(i -> i.get("codigo").asString()).toList().reversed());

        mvc.perform(get("/api/v1/publico/filtros")).andExpect(status().isOk())
                .andExpect(jsonPath("$.proyectos", hasItems("Altos de Ventisca", "Rinconada del Lúcumo", "Terrazas de Sauzal")))
                .andExpect(jsonPath("$.distritos", hasItems("Subtanjalla", "La Tinguiña", "Salas")));
    }

    // ------------------------------------------------------------------ autorización y publicación

    @Test
    @DisplayName("Sin autorización vigente de la partida matriz, sus lotes no se ofrecen; publicar no cambia el indicador A")
    void autorizacionDeLaMatriz() throws Exception {
        String asesor = token("asesor-01");
        int antes = lista().get("total").asInt();
        JsonNode evaluacion = leerComo(MATRIZ_VENTISCA, asesor).get("evaluacion");
        int hist = historial();
        try {
            mvc.perform(delete("/api/v1/casos/" + MATRIZ_VENTISCA + "/autorizacion").header("Authorization", asesor))
                    .andExpect(status().isOk());
            assertThat(lista().get("total").asInt()).isEqualTo(antes - 56);
            assertThat(lista("proyecto", "Altos de Ventisca").get("total").asInt()).isZero();
            JsonNode p = proyecto(LUCUMO); // los otros proyectos siguen igual
            assertThat(p.get("lotes").get(0).get("publicado").asBoolean()).isTrue();
            // El proyecto ya no ofrece lotes: su página da 404, como un caso en borrador.
            mvc.perform(get("/api/v1/publico/proyectos/" + VENTISCA)).andExpect(status().isNotFound());
            mvc.perform(get("/api/v1/publico/proyectos/" + VENTISCA + "/lotes/A-1")).andExpect(status().isNotFound());
            mvc.perform(get("/api/v1/publico/proyectos/" + VENTISCA + "/documentos/TASACION")).andExpect(status().isNotFound());
            // Publicar un lote exige la autorización.
            mvc.perform(delete("/api/v1/proyectos/" + VENTISCA + "/lotes/A-2/publicacion").header("Authorization", asesor))
                    .andExpect(status().isOk());
            mvc.perform(post("/api/v1/proyectos/" + VENTISCA + "/lotes/A-2/publicacion").header("Authorization", asesor))
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.detail").value(containsString("autorización vigente")));
        } finally {
            mvc.perform(put("/api/v1/casos/" + MATRIZ_VENTISCA + "/autorizacion").header("Authorization", asesor))
                    .andExpect(status().isOk());
            mvc.perform(post("/api/v1/proyectos/" + VENTISCA + "/lotes/A-2/publicacion").header("Authorization", asesor))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.publicado").value(true));
        }
        assertThat(lista().get("total").asInt()).isEqualTo(antes);
        // Ni la autorización ni la publicación recalculan la evaluación de la partida matriz.
        JsonNode despues = leerComo(MATRIZ_VENTISCA, asesor).get("evaluacion");
        assertThat(despues.get("estado")).isEqualTo(evaluacion.get("estado"));
        assertThat(despues.get("calculadaEn")).isEqualTo(evaluacion.get("calculadaEn"));
        assertThat(historial()).isEqualTo(hist);
    }

    @Test
    @DisplayName("Publicar, retirar y cambiar el estado de un lote: gestor o asesor; el resto, 401 o 403")
    void permisosDelEquipo() throws Exception {
        String asesor = token("asesor-01");
        String ruta = "/api/v1/proyectos/" + SAUZAL + "/lotes/F-1";
        mvc.perform(get("/api/v1/proyectos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/proyectos").header("Authorization", comprador())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/proyectos").header("Authorization", revisor())).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].codigo", hasItems(VENTISCA, LUCUMO, SAUZAL)));
        mvc.perform(get("/api/v1/proyectos").header("Authorization", asesor)).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.codigo == '" + SAUZAL + "')].lotes", contains(68)))
                .andExpect(jsonPath("$[?(@.codigo == '" + SAUZAL + "')].autorizacionVigente", contains(true)));
        mvc.perform(post(ruta + "/publicacion")).andExpect(status().isUnauthorized());
        for (String quien : new String[] {comprador(), revisor(), propietario(1)}) {
            mvc.perform(post(ruta + "/publicacion").header("Authorization", quien)).andExpect(status().isForbidden());
            mvc.perform(put(ruta + "/estado-comercial").header("Authorization", quien)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estadoComercial\":\"VENDIDO\"}"))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(post(ruta + "/publicacion").header("Authorization", asesor)).andExpect(status().isConflict());
        JsonNode lote = lote(SAUZAL, "F-1");
        String estado = lote.get("estadoComercial").asString();
        int hist = historial();
        try {
            mvc.perform(delete(ruta + "/publicacion").header("Authorization", gestor())).andExpect(status().isOk())
                    .andExpect(jsonPath("$.publicado").value(false)).andExpect(jsonPath("$.precio").value(nullValue()));
            mvc.perform(get("/api/v1/publico/proyectos/" + SAUZAL + "/lotes/F-1")).andExpect(status().isNotFound());
            assertThat(lista("proyecto", "Terrazas de Sauzal").get("total").asInt()).isEqualTo(67);
            mvc.perform(delete(ruta + "/publicacion").header("Authorization", asesor)).andExpect(status().isConflict());
            mvc.perform(post(ruta + "/publicacion").header("Authorization", asesor)).andExpect(status().isOk());
            String otro = estado.equals("VENDIDO") ? "SEPARADO" : "VENDIDO";
            mvc.perform(put(ruta + "/estado-comercial").header("Authorization", asesor)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estadoComercial\":\"" + otro + "\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.estadoComercial").value(otro));
            assertThat(lote(SAUZAL, "F-1").get("estadoComercial").asString()).isEqualTo(otro);
            mvc.perform(put(ruta + "/estado-comercial").header("Authorization", asesor)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estadoComercial\":\"ROTO\"}"))
                    .andExpect(status().isBadRequest());
            mvc.perform(post("/api/v1/proyectos/" + SAUZAL + "/lotes/Z-99/publicacion").header("Authorization", asesor))
                    .andExpect(status().isNotFound());
        } finally {
            mvc.perform(put(ruta + "/estado-comercial").header("Authorization", asesor)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estadoComercial\":\"" + estado + "\"}"))
                    .andExpect(status().isOk());
        }
        assertThat(historial()).as("nada de esto recalcula el indicador A").isEqualTo(hist);
    }

    JsonNode lote(String proyecto, String clave) throws Exception {
        for (JsonNode l : proyecto(proyecto).get("lotes")) if (l.get("clave").asString().equals(clave)) return l;
        throw new AssertionError("No está el lote " + clave);
    }

    @Test
    @DisplayName("Un lote con caso propio: su ficha y su estado comercial son los del caso (no se duplican)")
    void loteConCasoPropio() throws Exception {
        String asesor = token("asesor-01");
        jdbc.update("update lote_proyecto set caso_codigo = ? where numero = 1 and manzana = 'A' and proyecto_id = "
                + "(select id from proyecto where codigo = ?)", SANTIAGO, VENTISCA);
        try {
            JsonNode l = lote(VENTISCA, "A-1");
            assertThat(l.get("casoCodigo").asString()).isEqualTo(SANTIAGO);
            assertThat(l.get("estadoComercial").asString()).isEqualTo("DISPONIBLE"); // el del caso
            // En el catálogo aparece como el caso, no como un lote aparte.
            assertThat(codigos(todos("proyecto", "Altos de Ventisca"))).doesNotContain(VENTISCA + "-A-1").hasSize(55);
            // Cambiar el estado del lote cambia el del caso.
            mvc.perform(put("/api/v1/proyectos/" + VENTISCA + "/lotes/A-1/estado-comercial").header("Authorization", asesor)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estadoComercial\":\"SEPARADO\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.estadoComercial").value("SEPARADO"));
            assertThat(jdbc.queryForObject("select estado_comercial from caso_lote where codigo = ?", String.class, SANTIAGO))
                    .isEqualTo("SEPARADO");
            mvc.perform(post("/api/v1/proyectos/" + VENTISCA + "/lotes/A-1/publicacion").header("Authorization", asesor))
                    .andExpect(status().isUnprocessableContent());
        } finally {
            jdbc.update("update lote_proyecto set caso_codigo = null where caso_codigo = ?", SANTIAGO);
            jdbc.update("update caso_lote set estado_comercial = 'DISPONIBLE' where codigo = ?", SANTIAGO);
        }
    }

    // ------------------------------------------------------------------ página pública y ficha del lote

    @Test
    @DisplayName("Página del proyecto: plano, hitos, documentos e indicador A rotulado; sin datos internos")
    void paginaDelProyecto() throws Exception {
        String r = mvc.perform(get("/api/v1/publico/proyectos/" + VENTISCA)).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Altos de Ventisca"))
                .andExpect(jsonPath("$.lotes", hasSize(56)))
                .andExpect(jsonPath("$.lotes[0].clave").value("A-1"))
                .andExpect(jsonPath("$.hitos[0].orden").value(1))
                .andExpect(jsonPath("$.hitos[0].estadoEtiqueta").value("Completado"))
                .andExpect(jsonPath("$.indicadorA.fuente").value("PARTIDA_MATRIZ"))
                .andExpect(jsonPath("$.indicadorA.rotulo").value(ROTULO_MATRIZ))
                .andExpect(jsonPath("$.documentos[*].tipo", contains("PLANO_PERIMETRICO", "MEMORIA_DESCRIPTIVA",
                        "CERTIFICADO_ZONIFICACION", "TASACION")))
                .andReturn().getResponse().getContentAsString();
        assertThat(r).doesNotContain("propietario").doesNotContain("asesor-0").doesNotContain("\"gestion\"");
        JsonNode p = json.readTree(r);
        int suma = p.get("conteo").get("disponibles").asInt() + p.get("conteo").get("separados").asInt()
                + p.get("conteo").get("vendidos").asInt();
        assertThat(suma).isEqualTo(56);
        // Una esquina tiene 1.50 m más de frente.
        assertThat(lote(VENTISCA, "A-1").get("areaM2").decimalValue()).isEqualByComparingTo("166.25");
        assertThat(lote(VENTISCA, "A-2").get("areaM2").decimalValue()).isEqualByComparingTo("140.00");

        mvc.perform(get("/api/v1/publico/proyectos/no-existe")).andExpect(status().isNotFound());
        // Un proyecto que salió del texto de los casos: sin plano ni partida matriz, «sin evaluación documental».
        mvc.perform(get("/api/v1/publico/proyectos/campina-del-olivar")).andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes", hasSize(0)))
                .andExpect(jsonPath("$.inmueblesPublicados").value(1))
                .andExpect(jsonPath("$.indicadorA.fuente").value("SIN_EVALUACION"))
                .andExpect(jsonPath("$.indicadorA.rotulo").value("Sin evaluación documental"))
                .andExpect(jsonPath("$.documentos", hasSize(0)));
        // Un proyecto sin nada publicado no se ve.
        jdbc.update("insert into proyecto (codigo, nombre, distrito) values ('proyecto-interno', 'Proyecto interno', 'Ica')");
        jdbc.update("insert into lote_proyecto (proyecto_id, manzana, numero, area_m2, precio, publicado) "
                + "select id, 'A', 1, 120, 30000, true from proyecto where codigo = 'proyecto-interno'");
        mvc.perform(get("/api/v1/publico/proyectos/proyecto-interno")).andExpect(status().isNotFound());
        assertThat(codigos(todos())).doesNotContain("proyecto-interno-A-1");
    }

    @Test
    @DisplayName("Ficha pública de un lote: precio por m², zonificación e indicador A de la partida matriz")
    void fichaDelLote() throws Exception {
        JsonNode l = leerJson(get("/api/v1/publico/proyectos/" + SAUZAL + "/lotes/a-1"));
        assertThat(l.get("codigo").asString()).isEqualTo(SAUZAL + "-A-1");
        assertThat(l.get("denominacion").asString()).isEqualTo("Mz. A Lote 1 · Terrazas de Sauzal · Salas, Ica");
        assertThat(l.get("lote").get("zonificacion").asString()).isEqualTo("RDM");
        assertThat(l.get("predio").get("zonificacion").asString()).isEqualTo("RDM");
        assertThat(l.get("predio").get("independizacion").asString()).isEqualTo("PARTIDA_PROPIA");
        assertThat(l.get("predio").get("precioPorM2").decimalValue()).isEqualByComparingTo(
                l.get("lote").get("precio").decimalValue().divide(l.get("lote").get("areaM2").decimalValue(), 2,
                        RoundingMode.HALF_UP));
        assertThat(l.get("indicadorA").get("rotulo").asString()).isEqualTo(ROTULO_MATRIZ);
        assertThat(l.get("indicadorA").get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
        assertThat(leerJson(get("/api/v1/publico/proyectos/" + SAUZAL + "/lotes/D-3")).get("predio")
                .get("independizacion").asString()).isEqualTo("EN_PARTIDA_MATRIZ");
        for (String malo : new String[] {"Z-1", "A-99", "A", "x-y", "-1"}) {
            mvc.perform(get("/api/v1/publico/proyectos/" + SAUZAL + "/lotes/" + malo)).andExpect(status().isNotFound());
        }
    }

    @Test
    @DisplayName("Los documentos del proyecto se abren sin sesión, son referenciales y no se presentan como oficiales")
    void documentosDelProyecto() throws Exception {
        for (String tipo : new String[] {"PLANO_PERIMETRICO", "MEMORIA_DESCRIPTIVA", "CERTIFICADO_ZONIFICACION", "TASACION"}) {
            byte[] pdf = mvc.perform(get("/api/v1/publico/proyectos/" + LUCUMO + "/documentos/" + tipo))
                    .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_PDF))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                    .andReturn().getResponse().getContentAsByteArray();
            try (PDDocument doc = Loader.loadPDF(pdf)) {
                String texto = new PDFTextStripper().getText(doc);
                assertThat(texto).as(tipo).contains("Partida N.° " + MATRIZ_LUCUMO);
                assertThat(doc.getDocumentInformation().getSubject()).contains("referencial");
            }
        }
        mvc.perform(get("/api/v1/publico/proyectos/" + LUCUMO + "/documentos/OTRO")).andExpect(status().isBadRequest());
        // El caso de la partida matriz sigue sin verse por la API interna para el comprador (borrador).
        mvc.perform(get("/api/v1/casos/" + MATRIZ_LUCUMO).header("Authorization", comprador()))
                .andExpect(status().isNotFound());
    }
}
