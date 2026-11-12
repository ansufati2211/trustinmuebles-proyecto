package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 2): filtros, orden e independización del catálogo público. Cada filtro se comprueba contra un oráculo
 * independiente: se lee el catálogo completo sin filtros y se aplica la misma condición en la prueba. Además hay valores
 * conocidos de los casos de la carga. Base H2 propia porque una prueba modifica y restaura datos comerciales.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:filtros-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class FiltrosCatalogoTest extends BaseApiTest {

    JsonNode lista(String... parametros) throws Exception {
        MockHttpServletRequestBuilder req = get("/api/v1/publico/inmuebles");
        for (int i = 0; i < parametros.length; i += 2) req.param(parametros[i], parametros[i + 1]);
        return json.readTree(mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    /** Todos los items del catálogo (todas las páginas) con los parámetros dados. */
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
        return items.stream().map(i -> i.get("codigo").asString()).toList();
    }

    List<String> codigos(JsonNode pagina) {
        List<JsonNode> items = new ArrayList<>();
        pagina.get("items").forEach(items::add);
        return codigos(items);
    }

    /** Oráculo: los códigos del catálogo completo que cumplen la condición, sin ordenar. */
    List<String> esperados(Predicate<JsonNode> condicion) throws Exception {
        return todos().stream().filter(condicion).map(i -> i.get("codigo").asString()).sorted().toList();
    }

    void igualA(JsonNode respuesta, Predicate<JsonNode> condicion) throws Exception {
        List<String> esperado = esperados(condicion);
        assertThat(respuesta.get("total").asInt()).isEqualTo(esperado.size());
        assertThat(codigos(respuesta).stream().sorted().toList()).isEqualTo(esperado);
    }

    static BigDecimal d(JsonNode n, String campo) {
        return n.get("predio").hasNonNull(campo) ? n.get("predio").get(campo).decimalValue() : null;
    }

    @Test
    @DisplayName("Sin filtros el catálogo es el de siempre y cada tarjeta trae precio por m², proyecto, estado comercial e independización")
    void sinFiltros() throws Exception {
        JsonNode p = lista();
        assertThat(p.get("total").asInt()).isGreaterThanOrEqualTo(12);
        JsonNode santiago = p.get("items").findParents("codigo").stream()
                .filter(i -> i.get("codigo").asString().equals(SANTIAGO)).findFirst().orElseThrow();
        JsonNode pr = santiago.get("predio");
        assertThat(pr.get("precioPorM2").decimalValue()).isEqualByComparingTo("462.96"); // 75 000 / 162 m²
        assertThat(pr.get("proyecto").asString()).isEqualTo("Campiña del Olivar");
        assertThat(pr.get("estadoComercial").asString()).isEqualTo("DISPONIBLE");
        assertThat(pr.get("estadoComercialEtiqueta").asString()).isEqualTo("Disponible");
        assertThat(pr.get("independizacion").asString()).isEqualTo("PARTIDA_PROPIA");
    }

    @Test
    @DisplayName("Tipo: lote o vivienda (con sus alias cortos)")
    void tipo() throws Exception {
        JsonNode lotes = lista("tipo", "LOTE");
        igualA(lotes, i -> i.get("predio").get("tipoInmueble").asString().equals("LOTE_URBANO"));
        assertThat(codigos(lotes)).contains(SANTIAGO, HUARMEY, SUPE).doesNotContain(PARCONA);
        JsonNode viviendas = lista("tipo", "vivienda_urbana");
        igualA(viviendas, i -> i.get("predio").get("tipoInmueble").asString().equals("VIVIENDA_URBANA"));
        assertThat(codigos(viviendas)).contains(PARCONA).doesNotContain(SANTIAGO);
        assertThat(lotes.get("total").asInt() + viviendas.get("total").asInt()).isEqualTo(lista().get("total").asInt());
    }

    @Test
    @DisplayName("Distrito y proyecto: coinciden sin distinguir mayúsculas; la subasta de la SBN no tiene proyecto")
    void distritoYProyecto() throws Exception {
        assertThat(codigos(lista("distrito", "santiago"))).containsExactly(SANTIAGO);
        assertThat(codigos(lista("distrito", "La Tinguiña"))).containsExactly(TINGUINA);
        assertThat(codigos(lista("proyecto", "Santa Elvira"))).containsExactly(PARCONA);
        assertThat(codigos(lista("proyecto", "santa elvira", "distrito", "Santiago"))).isEmpty();
        assertThat(lista("proyecto", "No existe").get("total").asInt()).isZero();
        assertThat(codigos(lista("distrito", "Huarmey"))).containsExactly(HUARMEY);
        igualA(lista("proyecto", "Santa Elvira"), i -> "Santa Elvira".equals(
                i.get("predio").hasNonNull("proyecto") ? i.get("predio").get("proyecto").asString() : null));
        // El HUARMEY es una parcela de la SBN: no pertenece a un proyecto de la inmobiliaria.
        assertThat(todos().stream().filter(i -> i.get("codigo").asString().equals(HUARMEY)).findFirst().orElseThrow()
                .get("predio").get("proyecto").isNull()).isTrue();
    }

    @Test
    @DisplayName("Estado comercial: disponible, separado y vendido")
    void estadoComercial() throws Exception {
        assertThat(codigos(lista("estadoComercial", "SEPARADO"))).containsExactlyInAnyOrder(PUEBLO_NUEVO, PACHACUTEC);
        assertThat(lista("estadoComercial", "VENDIDO").get("total").asInt()).isZero();
        JsonNode disponibles = lista("estadoComercial", "disponible");
        igualA(disponibles, i -> i.get("predio").get("estadoComercial").asString().equals("DISPONIBLE"));
        assertThat(codigos(disponibles)).doesNotContain(PUEBLO_NUEVO, PACHACUTEC).contains(PARCONA);
    }

    @Test
    @DisplayName("Precio con moneda: sin moneda se entiende soles y nunca se mezclan soles con dólares")
    void precioConMoneda() throws Exception {
        JsonNode r = lista("precioMin", "100000", "precioMax", "150000");
        igualA(r, i -> "PEN".equals(i.get("predio").path("moneda").asString())
                && d(i, "precioReferencial").compareTo(new BigDecimal("100000")) >= 0
                && d(i, "precioReferencial").compareTo(new BigDecimal("150000")) <= 0);
        assertThat(codigos(r)).containsExactlyInAnyOrder(SUBTANJALLA, MOLINOS, PACHACUTEC);
        // 16 801,84 está dentro de «0 a 150 000», pero es en dólares: no entra sin pedir dólares.
        assertThat(codigos(lista("precioMax", "150000"))).doesNotContain(SUPE, HUARMEY);
        assertThat(codigos(lista("moneda", "USD"))).containsExactlyInAnyOrder(HUARMEY, SUPE);
        assertThat(codigos(lista("moneda", "usd", "precioMax", "20000"))).containsExactly(SUPE);
        assertThat(codigos(lista("moneda", "PEN", "precioMin", "250000"))).containsExactly(ICA);
        // Un límite exacto se incluye.
        assertThat(codigos(lista("precioMin", "185000", "precioMax", "185000"))).containsExactly(PARCONA);
    }

    @Test
    @DisplayName("Precio por m² con moneda: dólares por m² muy bajos no se cuelan entre los soles")
    void precioPorM2() throws Exception {
        JsonNode caros = lista("precioM2Min", "1000");
        igualA(caros, i -> "PEN".equals(i.get("predio").path("moneda").asString()) && d(i, "precioPorM2") != null
                && d(i, "precioPorM2").compareTo(new BigDecimal("1000")) >= 0);
        assertThat(codigos(caros)).containsExactlyInAnyOrder(PARCONA, TINGUINA, PACHACUTEC, ICA);
        JsonNode baratos = lista("precioM2Max", "500");
        assertThat(codigos(baratos)).containsExactlyInAnyOrder(SUBTANJALLA, SANTIAGO, SALAS) // Molinos: 550
                .doesNotContain(SUPE, HUARMEY);
        assertThat(codigos(lista("moneda", "USD", "precioM2Max", "15"))).containsExactlyInAnyOrder(HUARMEY, SUPE);
    }

    @Test
    @DisplayName("Área: mínimo y máximo sobre el área del terreno")
    void area() throws Exception {
        JsonNode r = lista("areaMin", "200", "areaMax", "250");
        igualA(r, i -> d(i, "areaM2") != null && d(i, "areaM2").compareTo(new BigDecimal("200")) >= 0
                && d(i, "areaM2").compareTo(new BigDecimal("250")) <= 0);
        assertThat(codigos(r)).containsExactlyInAnyOrder(TINGUINA, SUBTANJALLA, SALAS, MOLINOS);
        assertThat(codigos(lista("areaMin", "5000"))).containsExactlyInAnyOrder(HUARMEY, SUPE);
        assertThat(lista("areaMin", "100000").get("total").asInt()).isZero();
    }

    @Test
    @DisplayName("Indicador A y tipo de alerta: el color sigue siendo el de las reglas")
    void indicadorAYAlerta() throws Exception {
        JsonNode verdes = lista("indicadorA", "VERDE");
        igualA(verdes, i -> "VERDE".equals(i.get("estado").asString()));
        assertThat(codigos(verdes)).contains(PARCONA).doesNotContain(SUBTANJALLA, LOS_AQUIJES);
        JsonNode grises = lista("indicadorA", "gris");
        igualA(grises, i -> "GRIS".equals(i.get("estado").asString()));
        assertThat(codigos(grises)).contains(SUBTANJALLA, LOS_AQUIJES);
        // «Información insuficiente» es el tipo de alerta de todo caso gris.
        JsonNode insuf = lista("tipoAlerta", "INFORMACION_INSUFICIENTE");
        igualA(insuf, i -> "GRIS".equals(i.get("estado").asString()));
        // Una regla concreta: lo que dice cada tarjeta en tiposAlerta es lo que filtra.
        String regla = todos().stream().flatMap(i -> {
            List<JsonNode> t = new ArrayList<>();
            i.get("tiposAlerta").forEach(t::add);
            return t.stream();
        }).map(JsonNode::asString).filter(t -> !t.equals("INFORMACION_INSUFICIENTE")).findFirst().orElseThrow();
        JsonNode porRegla = lista("tipoAlerta", regla.toLowerCase());
        igualA(porRegla, i -> {
            for (JsonNode t : i.get("tiposAlerta")) if (t.asString().equals(regla)) return true;
            return false;
        });
        assertThat(porRegla.get("total").asInt()).isPositive();
    }

    @Test
    @DisplayName("Los filtros se combinan con «y»")
    void combinados() throws Exception {
        JsonNode r = lista("tipo", "VIVIENDA", "indicadorA", "GRIS", "precioMax", "150000", "areaMin", "100");
        igualA(r, i -> i.get("predio").get("tipoInmueble").asString().equals("VIVIENDA_URBANA")
                && "GRIS".equals(i.get("estado").asString()) && "PEN".equals(i.get("predio").path("moneda").asString())
                && d(i, "precioReferencial").compareTo(new BigDecimal("150000")) <= 0
                && d(i, "areaM2").compareTo(new BigDecimal("100")) >= 0);
        assertThat(codigos(r)).contains(SUBTANJALLA, LOS_AQUIJES);
        assertThat(codigos(lista("distrito", "Santiago", "estadoComercial", "SEPARADO"))).isEmpty();
        assertThat(codigos(lista("distrito", "Parcona", "estadoComercial", "DISPONIBLE", "indicadorA", "VERDE")))
                .containsExactly(PARCONA);
    }

    @Test
    @DisplayName("Orden: novedad, precio, precio por m² y área, ascendente y descendente")
    void orden() throws Exception {
        // Precio en soles
        List<BigDecimal> asc = lista("orden", "precio", "moneda", "PEN").get("items").findValues("precioReferencial")
                .stream().map(JsonNode::decimalValue).toList();
        assertThat(asc).isSorted();
        assertThat(asc.get(0)).isEqualByComparingTo("75000");
        List<BigDecimal> desc = lista("orden", "precio", "sentido", "desc", "moneda", "PEN").get("items")
                .findValues("precioReferencial").stream().map(JsonNode::decimalValue).toList();
        assertThat(desc).isSortedAccordingTo(java.util.Comparator.reverseOrder());
        assertThat(desc.get(0)).isEqualByComparingTo("260000");
        // Sin moneda elegida: primero los soles, de menor a mayor, y después los dólares.
        List<JsonNode> mezcla = lista("orden", "precio").get("items").findParents("codigo");
        assertThat(codigos(mezcla).subList(mezcla.size() - 2, mezcla.size())).containsExactlyInAnyOrder(HUARMEY, SUPE);
        // Precio por m²
        List<BigDecimal> m2 = lista("orden", "precioM2", "moneda", "PEN").get("items").findValues("precioPorM2")
                .stream().map(JsonNode::decimalValue).toList();
        assertThat(m2).isSorted();
        assertThat(lista("orden", "precioM2", "sentido", "desc", "moneda", "PEN").get("items").get(0).get("codigo")
                .asString()).isEqualTo(ICA);
        // Área
        assertThat(lista("orden", "area").get("items").get(0).get("codigo").asString()).isEqualTo(LOS_AQUIJES); // 120 m², el primero por código
        assertThat(lista("orden", "area", "sentido", "desc").get("items").get(0).get("codigo").asString())
                .isEqualTo(SUPE);
        // Novedad: lo último en cargarse primero (por omisión) o al revés con asc.
        List<String> nuevos = codigos(lista("orden", "novedad"));
        List<String> viejos = codigos(lista("orden", "novedad", "sentido", "asc"));
        assertThat(nuevos).isEqualTo(viejos.reversed());
        assertThat(codigos(lista())).isEqualTo(nuevos);
        // «precioM2» y «PRECIO_M2» son lo mismo
        assertThat(codigos(lista("orden", "PRECIO_M2", "moneda", "PEN")))
                .isEqualTo(codigos(lista("orden", "precioM2", "moneda", "PEN")));
    }

    @Test
    @DisplayName("Filtro y orden se combinan, y el contador es el total de lo filtrado")
    void filtroYOrden() throws Exception {
        JsonNode r = lista("tipo", "VIVIENDA", "orden", "area", "sentido", "desc");
        assertThat(r.get("total").asInt()).isEqualTo(lista("tipo", "VIVIENDA").get("total").asInt());
        List<BigDecimal> areas = r.get("items").findValues("areaM2").stream().map(JsonNode::decimalValue).toList();
        assertThat(areas).isSortedAccordingTo(java.util.Comparator.reverseOrder());
        assertThat(areas.get(0)).isEqualByComparingTo("250");
    }

    @Test
    @DisplayName("Un valor no válido da 400 con la lista de valores aceptados")
    void valoresNoValidos() throws Exception {
        String[][] malos = {{"moneda", "EUR", "moneda"}, {"tipo", "casa", "tipo"}, {"indicadorA", "AZUL", "indicadorA"},
                {"tipoAlerta", "ZZ-99", "tipoAlerta"}, {"estadoComercial", "ROTO", "estadoComercial"},
                {"orden", "popular", "orden"}, {"sentido", "arriba", "sentido"}, {"precioMin", "abc", "precioMin"},
                {"areaMax", "-5", "areaMax"}, {"precioM2Min", "1,5", "precioM2Min"}};
        for (String[] m : malos) {
            mvc.perform(get("/api/v1/publico/inmuebles").param(m[0], m[1])).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value(containsString(m[2])));
        }
        mvc.perform(get("/api/v1/publico/inmuebles").param("precioMin", "200000").param("precioMax", "100000"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value(containsString("precioMin")));
        mvc.perform(get("/api/v1/publico/inmuebles").param("areaMin", "300").param("areaMax", "100"))
                .andExpect(status().isBadRequest());
        // Parámetros vacíos (un formulario sin rellenar) equivalen a no filtrar.
        assertThat(lista("proyecto", "", "precioMin", " ", "tipo", "", "orden", "").get("total").asInt())
                .isEqualTo(lista().get("total").asInt());
    }

    @Test
    @DisplayName("Los selectores se llenan con los proyectos, distritos y tipos de alerta, sin sesión")
    void opciones() throws Exception {
        mvc.perform(get("/api/v1/publico/filtros")).andExpect(status().isOk())
                .andExpect(jsonPath("$.proyectos", hasItems("Santa Elvira", "Campiña del Olivar")))
                .andExpect(jsonPath("$.distritos", hasItems("Parcona", "Santiago", "Huarmey")))
                .andExpect(jsonPath("$.tiposAlerta[*].codigo", hasItem("INFORMACION_INSUFICIENTE")));
    }

    @Test
    @DisplayName("Independización: precargada de forma coherente, visible en la ficha y sin efecto en el indicador A")
    void independizacion() throws Exception {
        String[][] esperado = {{PARCONA, "PARTIDA_PROPIA"}, {SANTIAGO, "PARTIDA_PROPIA"}, {LOS_AQUIJES, "NO_CONSTA"},
                {HUARMEY, "EN_PARTIDA_MATRIZ"}, {SUPE, "EN_PARTIDA_MATRIZ"}};
        for (String[] e : esperado) {
            mvc.perform(get("/api/v1/publico/inmuebles/" + e[0])).andExpect(status().isOk())
                    .andExpect(jsonPath("$.predio.independizacion").value(e[1]))
                    .andExpect(jsonPath("$.predio.independizacionEtiqueta").isNotEmpty())
                    .andExpect(jsonPath("$.predio.independizacionExplicacion").value(not(emptyString())));
        }
        // Cada valor es coherente con el antecedente que ya dice el expediente.
        for (JsonNode i : todos()) {
            String ind = i.get("predio").get("independizacion").asString();
            String ante = json.readTree(mvc.perform(get("/api/v1/publico/inmuebles/" + i.get("codigo").asString()))
                    .andReturn().getResponse().getContentAsString()).get("expediente").path("antecedenteDominial").asString("");
            if (ante.contains("a independizar")) assertThat(ind).isEqualTo("EN_PARTIDA_MATRIZ");
            else if (ante.contains("independiz")) assertThat(ind).isEqualTo("PARTIDA_PROPIA");
            else assertThat(ind).isEqualTo("NO_CONSTA");
        }

        // Cambiarla no cambia el color ni agrega evaluaciones.
        String asesor = token("asesor-01");
        JsonNode antes = leerComo(PARCONA, asesor);
        int historial = jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class);
        try {
            mvc.perform(put("/api/v1/casos/" + PARCONA + "/datos-comerciales").header("Authorization", asesor)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"independizacion\":\"EN_PARTIDA_MATRIZ\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.predio.independizacion").value("EN_PARTIDA_MATRIZ"))
                    .andExpect(jsonPath("$.evaluacion.estado").value(antes.get("evaluacion").get("estado").asString()))
                    .andExpect(jsonPath("$.evaluacion.calculadaEn").value(antes.get("evaluacion").get("calculadaEn").asString()));
            assertThat(jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class)).isEqualTo(historial);
        } finally {
            mvc.perform(put("/api/v1/casos/" + PARCONA + "/datos-comerciales").header("Authorization", asesor)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"independizacion\":\"PARTIDA_PROPIA\"}"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("Proyecto, estado comercial e independización los edita el asesor o el revisor; el comprador y quien no inició sesión, no")
    void editarDatosComerciales() throws Exception {
        String cuerpo = "{\"proyecto\":\"Proyecto de prueba\",\"estadoComercial\":\"VENDIDO\"}";
        mvc.perform(put("/api/v1/casos/" + SANTIAGO + "/datos-comerciales").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/casos/" + SANTIAGO + "/datos-comerciales").header("Authorization", comprador())
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + SANTIAGO + "/datos-comerciales").header("Authorization", token("asesor-01"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"estadoComercial\":\"EXISTE_NO\"}"))
                .andExpect(status().isBadRequest());
        try {
            mvc.perform(put("/api/v1/casos/" + SANTIAGO + "/datos-comerciales").header("Authorization", revisor())
                    .contentType(MediaType.APPLICATION_JSON).content(cuerpo)).andExpect(status().isOk());
            assertThat(codigos(lista("proyecto", "Proyecto de prueba", "estadoComercial", "VENDIDO"))).containsExactly(SANTIAGO);
            assertThat(codigos(lista("proyecto", "Campiña del Olivar"))).doesNotContain(SANTIAGO);
        } finally {
            mvc.perform(put("/api/v1/casos/" + SANTIAGO + "/datos-comerciales").header("Authorization", token("asesor-01"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"proyecto\":\"Campiña del Olivar\",\"estadoComercial\":\"DISPONIBLE\"}"))
                    .andExpect(status().isOk());
        }
        assertThat(codigos(lista("proyecto", "Campiña del Olivar"))).contains(SANTIAGO);
    }
}
