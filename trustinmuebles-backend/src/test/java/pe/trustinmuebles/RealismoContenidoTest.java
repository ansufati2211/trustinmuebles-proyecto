package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 6): realismo del contenido. PDF de los casos publicados sin sesión (el informe técnico B sigue pidiendo
 * sesión), número de partida oculto en la ficha registral pública, filtros por zonificación y por uso, recomendables
 * sobre todos los resultados, robots.txt, titulares reservados en los casos precargados y especialistas sin colegiatura.
 */
class RealismoContenidoTest extends BaseApiTest {

    private byte[] pdfPublico(String ruta) throws Exception {
        return mvc.perform(get("/api/v1/publico/inmuebles/" + ruta)).andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", containsString("sandbox")))
                .andReturn().getResponse().getContentAsByteArray();
    }

    private static String texto(byte[] pdf) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    // ------------------------------------------------------------------------------------------- PDF públicos

    @Test
    @DisplayName("La ficha registral de un caso publicado se abre sin sesión, con su rótulo y la partida parcialmente oculta")
    void fichaRegistralPublica() throws Exception {
        String t = texto(pdfPublico(TINGUINA + "/documento"));
        assertThat(t).contains("FICHA REGISTRAL DEL INMUEBLE", "TRUSTINMUEBLES · INMOBILIARIA EN ICA",
                "Partida N.° 1105••••", "no reemplaza la copia literal que emite SUNARP",
                "dos personas naturales (datos reservados)");
        assertThat(t).doesNotContain("11052690", "COPIA LITERAL DE PARTIDA REGISTRAL", "Tomo Diario", "Derechos cobrados");
        // Con sesión, el expediente sigue dando la ficha guardada con la partida completa.
        assertThat(textoDelPdfInterno(TINGUINA)).contains("Partida N.° 11052690", "FICHA REGISTRAL DEL INMUEBLE");
    }

    private String textoDelPdfInterno(String codigo) throws Exception {
        return texto(mvc.perform(get("/api/v1/casos/" + codigo + "/documento").header("Authorization", revisor()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
    }

    @Test
    @DisplayName("Las láminas y los documentos del lote de un caso publicado se abren sin sesión, rotulados por la inmobiliaria")
    void laminasYDocumentosDelLotePublicos() throws Exception {
        String lamina = texto(pdfPublico(TINGUINA + "/planos/ARQUITECTURA/documento"));
        assertThat(lamina).contains("TRUSTINMUEBLES · DOCUMENTO TÉCNICO REFERENCIAL", "1105••••").doesNotContain("11052690");
        String perimetro = texto(pdfPublico(SANTIAGO + "/documentos-lote/PLANO_PERIMETRICO/documento"));
        assertThat(perimetro).contains("TRUSTINMUEBLES", "1108••••").doesNotContain("11081204");
        // Un plano no presentado no existe ni con sesión ni sin ella.
        mvc.perform(get("/api/v1/publico/inmuebles/" + TINGUINA + "/planos/ELECTRICAS/documento"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("El informe técnico B sigue pidiendo sesión: no hay ruta pública y sin token da 401")
    void informeTecnicoSigueConSesion() throws Exception {
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/inspeccion/documento")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/publico/inmuebles/" + PARCONA + "/inspeccion/documento"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/inspeccion/documento").header("Authorization", comprador()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Los PDF de un borrador o de un caso retirado dan 404 sin sesión")
    void borradorYRetiradoDan404() throws Exception {
        for (String ruta : new String[] {"/documento", "/documentos-lote/PLANO_PERIMETRICO/documento"}) {
            mvc.perform(get("/api/v1/publico/inmuebles/" + MATRIZ_VENTISCA + ruta)).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/v1/publico/inmuebles/NO-EXISTE/documento")).andExpect(status().isNotFound());
        try {
            mvc.perform(delete("/api/v1/casos/" + SANTIAGO + "/publicacion").header("Authorization", gestor()))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/v1/publico/inmuebles/" + SANTIAGO + "/documento")).andExpect(status().isNotFound());
            mvc.perform(get("/api/v1/publico/inmuebles/" + SANTIAGO + "/documentos-lote/PLANO_PERIMETRICO/documento"))
                    .andExpect(status().isNotFound());
        } finally {
            mvc.perform(post("/api/v1/casos/" + SANTIAGO + "/publicacion").header("Authorization", gestor()))
                    .andExpect(status().isOk());
        }
        pdfPublico(SANTIAGO + "/documento");
    }

    // ---------------------------------------------------------------------------- zonificación y uso

    /** Todos los inmuebles del catálogo, página por página. */
    private List<JsonNode> todos(String filtros) throws Exception {
        List<JsonNode> salida = new ArrayList<>();
        for (int n = 0; ; n++) {
            JsonNode p = json.readTree(mvc.perform(get("/api/v1/publico/inmuebles?pagina=" + n + filtros))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
            p.get("items").forEach(salida::add);
            if (n + 1 >= p.get("totalPaginas").asInt()) return salida;
        }
    }

    private static String zona(JsonNode i) {
        JsonNode z = i.get("predio").get("zonificacion");
        return z == null || z.isNull() ? null : z.asString().trim().toUpperCase();
    }

    private static BigDecimal area(JsonNode i) {
        JsonNode a = i.get("predio").get("areaM2");
        return a == null || a.isNull() ? null : a.decimalValue();
    }

    @Test
    @DisplayName("Filtro por zonificación (con alias) y por uso según la guía; sin zonificación solo si se pide")
    void filtroPorZonificacionYUso() throws Exception {
        List<JsonNode> catalogo = todos("");
        long conRdm = catalogo.stream().filter(i -> "RDM".equals(zona(i))).count();
        long sinZona = catalogo.stream().filter(i -> zona(i) == null).count();
        assertThat(conRdm).as("la precarga tiene lotes RDM").isPositive();
        assertThat(sinZona).as("y casos sin zonificación").isPositive();

        List<JsonNode> rdm = todos("&zonificacion=RDM");
        assertThat(rdm).hasSize((int) conRdm).allMatch(i -> "RDM".equals(zona(i)));
        assertThat(todos("&zonificacion=r4")).as("R4 es un alias de RDM").hasSize((int) conRdm);
        assertThat(todos("&zonificacion=RDM&incluirSinZonificacion=true")).hasSize((int) (conRdm + sinZona));

        // Para casa: RDM y CV desde 90 m² (usos-lote.json); un oráculo independiente sobre el catálogo completo.
        long casa = catalogo.stream().filter(i -> zona(i) != null && Set.of("RDM", "CV").contains(zona(i))
                && (area(i) == null || area(i).compareTo(new BigDecimal("90")) >= 0)).count();
        assertThat(todos("&uso=CASA")).hasSize((int) casa);
        assertThat(todos("&uso=casa&incluirSinZonificacion=true")).hasSize((int) (casa + sinZona));
        // Para almacén: solo CV desde 200 m² entre las zonas de la precarga.
        assertThat(todos("&uso=ALMACEN")).allMatch(i -> "CV".equals(zona(i))
                && area(i).compareTo(new BigDecimal("200")) >= 0);
        // Se combina con los demás filtros.
        assertThat(todos("&uso=CASA&proyecto=Altos de Ventisca"))
                .allMatch(i -> "Altos de Ventisca".equals(i.get("predio").get("proyecto").asString()));
    }

    @Test
    @DisplayName("Una zonificación, un uso o un incluirSinZonificacion no válidos dan 400 con los valores aceptados")
    void zonificacionInvalida() throws Exception {
        mvc.perform(get("/api/v1/publico/inmuebles?zonificacion=XYZ")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("RDM")));
        mvc.perform(get("/api/v1/publico/inmuebles?uso=PISCINA")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("ALMACEN")));
        mvc.perform(get("/api/v1/publico/inmuebles?uso=CASA&incluirSinZonificacion=quizas"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Recomendables: todos los que cumplen el filtro (no una página), sin vendidos y con su indicador A")
    void recomendablesSobreTodos() throws Exception {
        List<JsonNode> catalogo = todos("&tipo=LOTE");
        long noVendidos = catalogo.stream()
                .filter(i -> !"VENDIDO".equals(i.get("predio").get("estadoComercial").asString())).count();
        assertThat(catalogo.size()).as("más de una página").isGreaterThan(24);
        JsonNode r = json.readTree(mvc.perform(get("/api/v1/publico/inmuebles/recomendables?tipo=LOTE"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(r.get("total").asInt()).isEqualTo((int) noVendidos);
        assertThat(r.get("items").size()).isEqualTo((int) noVendidos);
        assertThat(r.get("truncado").asBoolean()).isFalse();
        r.get("items").forEach(i -> assertThat(i.get("predio").get("estadoComercial").asString()).isNotEqualTo("VENDIDO"));
        JsonNode lote = null;
        for (JsonNode i : r.get("items")) if ("altos-de-ventisca".equals(i.get("proyectoCodigo").asString())) lote = i;
        assertThat(lote).isNotNull();
        assertThat(lote.get("clase").asString()).isEqualTo("LOTE_PROYECTO");
        assertThat(lote.get("estado").asString()).isEqualTo("VERDE");
        assertThat(lote.get("fuenteIndicadorA").asString()).isEqualTo("PARTIDA_MATRIZ");
        assertThat(lote.get("lote").asString()).matches("[A-Z0-9]+-\\d+");
        // Los mismos filtros que el catálogo, incluidos los nuevos.
        mvc.perform(get("/api/v1/publico/inmuebles/recomendables?uso=NADA")).andExpect(status().isBadRequest());
        JsonNode casa = json.readTree(mvc.perform(get("/api/v1/publico/inmuebles/recomendables?uso=CASA"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        casa.get("items").forEach(i -> assertThat(zona(i)).isIn("RDM", "CV"));
    }

    // ---------------------------------------------------------------------------------------- robots

    @Test
    @DisplayName("Mientras app.sitio.indexable sea false, robots.txt pide no rastrear nada y el sitio dice no indexable")
    void robotsSinIndexar() throws Exception {
        mvc.perform(get("/robots.txt")).andExpect(status().isOk())
                .andExpect(content().string(containsString("Disallow: /\n")));
        mvc.perform(get("/api/v1/publico/sitio")).andExpect(status().isOk())
                .andExpect(jsonPath("$.indexable").value(false));
    }

    // -------------------------------------------------------------------------- contenido precargado

    @Test
    @DisplayName("Los titulares de los casos precargados son «Persona natural (datos reservados)» o empresas")
    void titularesReservados() {
        List<String> titulares = jdbc.queryForList("select a.titulares from asiento a join expediente e on e.id = "
                + "a.expediente_id join caso_lote c on c.id = e.caso_id where a.titulares is not null "
                + "and c.codigo not like 'SIM-9%'", String.class);
        assertThat(titulares).isNotEmpty().allMatch(t -> t.contains("Persona natural (datos reservados)")
                || t.matches(".*\\b(S\\.A\\.C\\.|S\\.R\\.L\\.|S\\.A\\.)\\s.*"));
        assertThat(jdbc.queryForObject("select count(*) from expediente where titularidad like '%datos reservados%'",
                Integer.class)).isGreaterThanOrEqualTo(7);
        assertThat(jdbc.queryForObject("select count(*) from ajuste_contenido where clave = ?", Integer.class,
                "v1.0-etapa-6-titulares-y-ficha")).isEqualTo(1);
    }

    @Test
    @DisplayName("Los especialistas tienen nombre y especialidad, sin número de colegiatura, y pueden firmar igual")
    void especialistasSinColegiatura() {
        assertThat(jdbc.queryForObject("select count(*) from usuario where rol = 'ESPECIALISTA' and colegiatura is not null",
                Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from usuario where rol = 'ESPECIALISTA' and nombre_completo is "
                + "not null and especialidad is not null", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(*) from evaluacion_tecnica where colegiatura is not null",
                Integer.class)).isZero();
    }

    @Test
    @DisplayName("Las semillas no usan palabras de prueba: demostración, prueba, ficticio, simulado ni «de ejemplo»")
    void semillasSinPalabrasDePrueba() throws Exception {
        List<Path> archivos = new ArrayList<>();
        try (var s = Files.list(Path.of("src/main/resources/contenido/v0.5/casos"))) {
            s.forEach(archivos::add);
        }
        archivos.add(Path.of("src/main/resources/contenido/proyectos.json"));
        archivos.add(Path.of("src/main/resources/contenido/usos-lote.json"));
        for (Path f : archivos) {
            String t = Files.readString(f).toLowerCase();
            assertThat(t).as(f.toString()).doesNotContain("demostración", "demostracion", "prueba", "ficticio",
                    "ficticia", "simulad", "de ejemplo");
        }
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where lower(coalesce(fuente, '')) like '%simulad%' "
                + "or lower(coalesce(fuente, '')) like '%demostraci%'", Integer.class)).isZero();
    }

    @Test
    @DisplayName("La guía de usos del servidor es la misma que la de la interfaz")
    void guiaDeUsosIgualQueLaInterfaz() throws Exception {
        Path interfaz = Path.of("../trustinmuebles/src/contenido/usos-lote.json");
        if (!Files.exists(interfaz)) return; // se corre el servidor solo, sin la carpeta de la interfaz
        assertThat(json.readTree(Files.readString(Path.of("src/main/resources/contenido/usos-lote.json"))))
                .isEqualTo(json.readTree(Files.readString(interfaz)));
    }
}
