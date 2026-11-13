package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v1.0 (etapa 7): kit de respaldo de la demostración (docs/demo/kit). Los tres textos de partida, registrados como lo hace
 * el asesor después de pulsar «Leer asientos», con los PDF del kit subidos, dan el color que anuncia el kit: vivienda sin
 * cargas en verde, lote con hipoteca vigente en amarillo y lote con embargo en rojo. Los PDF del kit son válidos, llevan
 * el rótulo de la inmobiliaria y no se presentan como oficiales. Además: la versión 1.0.0 y la partida matriz oculta.
 */
class KitDemoTest extends BaseApiTest {

    static final Path KIT = Path.of("..", "docs", "demo", "kit");
    static final String VIVIENDA = "INT-99000611";
    static final String HIPOTECA = "INT-99000612";
    static final String EMBARGO = "INT-99000613";

    private String asesor() throws Exception {
        return token("asesor-01");
    }

    /** Lo mismo que deja el formulario de registro al leer el texto del kit (lib/kit.test.ts comprueba la lectura). */
    private ObjectNode registro(String codigo, String denominacion, String area, boolean vivienda, String[][] asientos) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "SIMULADA_DEMOSTRACION");
        p.put("numero", codigo);
        p.put("denominacion", denominacion);
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-11-13");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        p.put("zonaRegistral", "Zona Registral N.° XI - Sede Ica");
        p.put("oficinaRegistral", "Oficina Registral de Ica");
        p.put("ubicacion", denominacion);
        p.put("areaM2", Double.parseDouble(area));
        p.put("tipoPredio", vivienda ? "VIVIENDA" : "LOTE");
        if (vivienda) p.put("areaConstruidaInscrita", 120.00);
        ArrayNode a = p.putArray("asientos");
        for (String[] x : asientos) {
            ObjectNode n = a.addObject();
            n.put("referencia", x[0]);
            n.put("tipoActo", x[1]);
            if (x[0].startsWith("D")) n.put("estado", "VIGENTE");
            n.put("texto", x[2]);
            if (x[0].startsWith("C")) n.put("titulares", x[3]);
            n.put("tituloNumero", x[4]);
            n.put("fechaInscripcion", x[5]);
        }
        p.put("confirmaSinDatosPersonales", true);
        p.put("titularidadComercial", "PARTICULAR");
        p.put("propietarioCodigo", "propietario-02");
        p.put("precioReferencial", vivienda ? 285000 : 40000);
        return p;
    }

    private JsonNode registrar(ObjectNode cuerpo) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/casos").header("Authorization", asesor())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private static byte[] delKit(String codigo, String archivo) throws Exception {
        return Files.readAllBytes(KIT.resolve("pdf").resolve(codigo).resolve(archivo));
    }

    private void subir(String ruta, byte[] pdf) throws Exception {
        mvc.perform(multipart("/api/v1/casos/" + ruta + "/documento")
                        .file(new MockMultipartFile("documento", "kit.pdf", "application/pdf", pdf))
                        .header("Authorization", asesor()))
                .andExpect(status().is2xxSuccessful());
    }

    private String color(String codigo) throws Exception {
        return leerComo(codigo, asesor()).get("evaluacion").get("estado").asString();
    }

    private void borrar(String codigo) throws Exception {
        mvc.perform(delete("/api/v1/casos/" + codigo).header("Authorization", revisor()));
    }

    private void subirDocumentosDelLote(String codigo) throws Exception {
        String[][] docs = {{"PLANO_PERIMETRICO", "plano-perimetrico.pdf"}, {"MEMORIA_DESCRIPTIVA", "memoria-descriptiva.pdf"},
                {"CERTIFICADO_ZONIFICACION", "certificado-zonificacion.pdf"}, {"TASACION", "tasacion.pdf"}};
        for (String[] d : docs) subir(codigo + "/documentos-lote/" + d[0], delKit(codigo, d[1]));
    }

    @Test
    @DisplayName("Vivienda sin cargas del kit: nace en gris sin planos y queda en verde al subir las 4 láminas del kit")
    void viviendaSinCargas() throws Exception {
        try {
            JsonNode r = registrar(registro(VIVIENDA, "Mz. K Lote 9 · Urb. Los Viñedos de Ica · Ica", "180.00", true,
                    new String[][] {
                        {"C00001", "COMPRAVENTA", "COMPRAVENTA. Se inscribe el dominio del predio a favor de Persona natural (datos reservados) (100 %).",
                            "Persona natural (datos reservados) (100 %)", "2017-00061101", "2017-03-20"},
                        {"F00001", "OTRO", "DECLARATORIA DE FÁBRICA. Se declara la fábrica de una vivienda de dos pisos con área construida total de 120.00 m2.",
                            null, "2019-00061102", "2019-05-28"}}));
            assertThat(r.get("evaluacion").get("estado").asString()).isEqualTo("GRIS");
            for (String[] p : new String[][] {{"ARQUITECTURA", "plano-arquitectura.pdf"}, {"ESTRUCTURAS", "plano-estructuras.pdf"},
                    {"ELECTRICAS", "plano-electricas.pdf"}, {"SANITARIAS", "plano-sanitarias.pdf"}}) {
                subir(VIVIENDA + "/planos/" + p[0], delKit(VIVIENDA, p[1]));
            }
            assertThat(color(VIVIENDA)).isEqualTo("VERDE");
        } finally {
            borrar(VIVIENDA);
        }
    }

    @Test
    @DisplayName("Lote con hipoteca vigente del kit: con sus 4 documentos queda en amarillo por la hipoteca (RV-02)")
    void loteConHipoteca() throws Exception {
        try {
            registrar(registro(HIPOTECA, "Mz. B Lote 14 · Hab. Urb. Las Dunas de Cachiche · Ica", "160.00", false,
                    new String[][] {
                        {"C00001", "COMPRAVENTA", "COMPRAVENTA. Se inscribe el dominio del predio a favor de Inmobiliaria Arenales del Sur S.A.C. (100 %).",
                            "Inmobiliaria Arenales del Sur S.A.C. (100 %)", "2020-00061201", "2020-01-22"},
                        {"D00001", "HIPOTECA", "HIPOTECA. Se constituye hipoteca sobre el predio a favor de Banco Andino del Sur S.A.",
                            null, "2023-00061202", "2023-05-02"}}));
            subirDocumentosDelLote(HIPOTECA);
            JsonNode ev = leerComo(HIPOTECA, asesor()).get("evaluacion");
            assertThat(ev.get("estado").asString()).isEqualTo("AMARILLO");
            assertThat(ev.get("reglasAplicadas").toString()).contains("RV-02");
        } finally {
            borrar(HIPOTECA);
        }
    }

    @Test
    @DisplayName("Lote con embargo del kit: con sus 4 documentos queda en rojo por el embargo vigente (RP-01)")
    void loteConEmbargo() throws Exception {
        try {
            registrar(registro(EMBARGO, "Mz. C Lote 6 · Hab. Urb. Las Dunas de Cachiche · Ica", "150.00", false,
                    new String[][] {
                        {"C00001", "COMPRAVENTA", "COMPRAVENTA. Se inscribe el dominio del predio a favor de Persona natural (datos reservados) (100 %).",
                            "Persona natural (datos reservados) (100 %)", "2018-00061301", "2018-09-26"},
                        {"D00001", "EMBARGO", "EMBARGO EN FORMA DE INSCRIPCIÓN. Se anota el embargo sobre el predio, seguido por Comercializadora Valle Verde S.A.C.",
                            null, "2024-00061302", "2024-06-17"}}));
            subirDocumentosDelLote(EMBARGO);
            JsonNode ev = leerComo(EMBARGO, asesor()).get("evaluacion");
            assertThat(ev.get("estado").asString()).isEqualTo("ROJO");
            assertThat(ev.get("reglasAplicadas").toString()).contains("RP-01");
        } finally {
            borrar(EMBARGO);
        }
    }

    @Test
    @DisplayName("Los PDF del kit son válidos, llevan el rótulo y el autor de la inmobiliaria y no se presentan como oficiales")
    void pdfDelKit() throws Exception {
        String[][] archivos = {
            {VIVIENDA, "plano-arquitectura.pdf"}, {VIVIENDA, "plano-estructuras.pdf"}, {VIVIENDA, "plano-electricas.pdf"},
            {VIVIENDA, "plano-sanitarias.pdf"}, {HIPOTECA, "plano-perimetrico.pdf"}, {HIPOTECA, "memoria-descriptiva.pdf"},
            {HIPOTECA, "certificado-zonificacion.pdf"}, {HIPOTECA, "tasacion.pdf"}, {EMBARGO, "plano-perimetrico.pdf"},
            {EMBARGO, "memoria-descriptiva.pdf"}, {EMBARGO, "certificado-zonificacion.pdf"}, {EMBARGO, "tasacion.pdf"}};
        for (String[] f : archivos) {
            try (PDDocument doc = Loader.loadPDF(delKit(f[0], f[1]))) {
                String t = new PDFTextStripper().getText(doc);
                assertThat(t).as(f[1]).contains("TRUSTINMUEBLES · INMOBILIARIA EN ICA", f[0],
                        "Documento informativo elaborado por la inmobiliaria Trustinmuebles.");
                assertThat(t).as(f[1]).doesNotContainIgnoringCase("CIP N").doesNotContainIgnoringCase("CAP N")
                        .doesNotContain("Colegio de", "MUNICIPALIDAD PROVINCIAL", "SUPERINTENDENCIA NACIONAL", "Código de verificación",
                                "Firma", "Sello", "compra segura", "saneado");
                assertThat(doc.getDocumentInformation().getAuthor()).as(f[1]).isEqualTo("Trustinmuebles · Inmobiliaria en Ica");
            }
        }
    }

    @Test
    @DisplayName("La versión del sistema es la 1.0.0 en el pom.xml, en package.json y en /publico/sitio")
    void version() throws Exception {
        assertThat(Files.readString(Path.of("pom.xml"))).containsPattern(
                "<artifactId>backend</artifactId>\\s*<version>1\\.0\\.0</version>");
        assertThat(Files.readString(Path.of("..", "trustinmuebles", "package.json"))).contains("\"version\": \"1.0.0\"");
        mvc.perform(get("/api/v1/publico/sitio")).andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value("1.0.0"))
                .andExpect(jsonPath("$.indexable").value(false));
    }

    @Test
    @DisplayName("Los documentos de la partida matriz: sin sesión, partida oculta; con sesión del equipo, completa")
    void partidaMatrizOculta() throws Exception {
        for (String tipo : new String[] {"PLANO_PERIMETRICO", "MEMORIA_DESCRIPTIVA", "CERTIFICADO_ZONIFICACION", "TASACION"}) {
            String ruta = "/api/v1/publico/proyectos/altos-de-ventisca/documentos/" + tipo;
            byte[] sin = mvc.perform(get(ruta)).andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.not(
                            org.hamcrest.Matchers.containsString(MATRIZ_VENTISCA))))
                    .andReturn().getResponse().getContentAsByteArray();
            byte[] con = mvc.perform(get(ruta).header("Authorization", asesor())).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsByteArray();
            try (PDDocument a = Loader.loadPDF(sin); PDDocument b = Loader.loadPDF(con)) {
                assertThat(new PDFTextStripper().getText(a)).as(tipo).contains("1111••••").doesNotContain(MATRIZ_VENTISCA);
                assertThat(new PDFTextStripper().getText(b)).as(tipo).contains(MATRIZ_VENTISCA);
            }
        }
    }
}
