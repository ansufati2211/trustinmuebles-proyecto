package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
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
import org.springframework.test.web.servlet.ResultActions;
import pe.trustinmuebles.shared.Hashing;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v0.9 (reglas v0.5): documentos del lote. El plano perimétrico y la memoria descriptiva son datos mínimos; el
 * certificado de zonificación y vías genera RV-07; la tasación es informativa. Como un plano, un documento solo queda
 * presentado con su PDF, y el motor lee su estado, nunca el archivo.
 */
class DocumentosLoteApiTest extends BaseApiTest {
    static final String LOTE = "SIM-99000910";

    ObjectNode lote(String numero) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "SIMULADA_DEMOSTRACION");
        p.put("numero", numero);
        p.put("denominacion", "Mz. R Lote 3 · Hab. Urb. Demostración · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-11-08");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        p.put("linderos", "Frente: con la Calle Las Palmeras, en 8.00 ml. Derecha: con el Lote 4, en 20.00 ml. "
                + "Izquierda: con el Lote 2, en 20.00 ml. Fondo: con el Lote 10, en 8.00 ml.");
        p.put("areaM2", 160.00);
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Se inscribe el dominio a favor de Inmobiliaria Demo Sur S.A.C. (100 %).");
        c.put("titulares", "Inmobiliaria Demo Sur S.A.C. (100 %)");
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-01");
        return p;
    }

    void registrar(ObjectNode cuerpo) throws Exception {
        mvc.perform(post("/api/v1/casos").header("Authorization", revisor()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(cuerpo))).andExpect(status().isCreated());
    }

    void borrar(String codigo) throws Exception {
        mvc.perform(delete("/api/v1/casos/" + codigo).header("Authorization", revisor()));
    }

    ResultActions subir(String codigo, String tipo, byte[] pdf, String authorization) throws Exception {
        return mvc.perform(multipart("/api/v1/casos/" + codigo + "/documentos-lote/" + tipo + "/documento")
                .file(new MockMultipartFile("documento", "documento.pdf", "application/pdf", pdf))
                .header("Authorization", authorization));
    }

    ResultActions descargar(String codigo, String tipo, String authorization) throws Exception {
        return mvc.perform(get("/api/v1/casos/" + codigo + "/documentos-lote/" + tipo + "/documento")
                .header("Authorization", authorization));
    }

    JsonNode evaluacion(String codigo) throws Exception {
        return leerComo(codigo, revisor()).get("evaluacion");
    }

    static String texto(byte[] pdf) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    @Test
    @DisplayName("Un lote captado nace en gris; al subir el plano, la memoria y la zonificación pasa a verde")
    void subirLosDocumentosCambiaElColor() throws Exception {
        try {
            registrar(lote(LOTE));
            JsonNode ev = evaluacion(LOTE);
            assertThat(ev.get("estado").asString()).isEqualTo("GRIS");
            assertThat(ev.get("faltantes").toString()).contains("Plano perimétrico y de ubicación", "Memoria descriptiva");
            assertThat(ev.get("reglasAplicadas").toString()).contains("RV-07");

            int antes = jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class);
            JsonNode subido = json.readTree(subir(LOTE, "PLANO_PERIMETRICO", PdfDePrueba.simple("Plano perimétrico"),
                    revisor()).andExpect(status().isCreated()).andExpect(jsonPath("$.sha256", hasLength(64)))
                    .andReturn().getResponse().getContentAsString());
            assertThat(jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class))
                    .as("subir un documento deja constancia en el historial").isEqualTo(antes + 1);
            assertThat(evaluacion(LOTE).get("faltantes").toString()).doesNotContain("Plano perimétrico")
                    .contains("Memoria descriptiva");

            subir(LOTE, "MEMORIA_DESCRIPTIVA", PdfDePrueba.simple("Memoria descriptiva"), revisor())
                    .andExpect(status().isCreated());
            ev = evaluacion(LOTE);
            assertThat(ev.get("estado").asString()).isEqualTo("AMARILLO");
            assertThat(ev.get("reglasAplicadas").toString()).isEqualTo("[\"RV-07\"]");

            subir(LOTE, "CERTIFICADO_ZONIFICACION", PdfDePrueba.simple("Zonificación"), revisor())
                    .andExpect(status().isCreated());
            assertThat(evaluacion(LOTE).get("estado").asString()).as("la tasación no hace falta").isEqualTo("VERDE");

            JsonNode docs = leerComo(LOTE, revisor()).get("expediente").get("documentosLote");
            assertThat(docs).hasSize(4);
            assertThat(docs.get(0).get("estado").asString()).isEqualTo("PRESENTADO");
            assertThat(docs.get(0).get("tieneDocumentoPropio").asBoolean()).isTrue();
            assertThat(docs.get(0).get("documento").get("origen").asString()).isEqualTo("SUBIDO");
            assertThat(docs.get(0).get("documento").get("subidoPor").asString()).isEqualTo("revisor-01");
            assertThat(docs.get(3).get("estado").asString()).isEqualTo("NO_PRESENTADO");
            byte[] descargado = descargar(LOTE, "PLANO_PERIMETRICO", revisor()).andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                    .andReturn().getResponse().getContentAsByteArray();
            assertThat(Hashing.sha256(descargado)).isEqualTo(subido.get("sha256").asString());
            descargar(LOTE, "TASACION", revisor()).andExpect(status().isNotFound());
        } finally {
            borrar(LOTE);
        }
    }

    @Test
    @DisplayName("Solo el revisor sube documentos del lote, y solo a un lote")
    void soloElRevisorYSoloEnUnLote() throws Exception {
        byte[] pdf = PdfDePrueba.simple("Documento");
        subir(SANTIAGO, "MEMORIA_DESCRIPTIVA", pdf, comprador()).andExpect(status().isForbidden());
        subir(SANTIAGO, "MEMORIA_DESCRIPTIVA", pdf, gestor()).andExpect(status().isForbidden());
        subir(SANTIAGO, "MEMORIA_DESCRIPTIVA", pdf, propietario(2)).andExpect(status().isForbidden());
        subir(TINGUINA, "MEMORIA_DESCRIPTIVA", pdf, revisor()).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail", containsString("solo aplican a un lote")));
        descargar(TINGUINA, "PLANO_PERIMETRICO", revisor()).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Marcar presentado un documento del lote sin su PDF da 422; una observación sin archivo sí se guarda")
    void presentadoSinArchivoDa422() throws Exception {
        try {
            registrar(lote(LOTE));
            JsonNode original = leerComo(LOTE, revisor());
            ObjectNode p = peticion(original);
            ArrayNode docs = (ArrayNode) p.get("documentosLote");
            for (var d : docs) {
                if (d.get("tipo").asString().equals("MEMORIA_DESCRIPTIVA")) ((ObjectNode) d).put("estado", "PRESENTADO");
            }
            actualizarExpediente(LOTE, revisor(), p).andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.detail", startsWith("Sube el PDF del documento antes de marcarlo como presentado")));

            p = peticion(original);
            for (var d : (ArrayNode) p.get("documentosLote")) {
                if (d.get("tipo").asString().equals("TASACION")) {
                    ((ObjectNode) d).put("observacion", "Pedir la tasación al propietario.");
                }
            }
            actualizarExpediente(LOTE, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.expediente.documentosLote[3].observacion")
                            .value("Pedir la tasación al propietario."))
                    .andExpect(jsonPath("$.evaluacion.estado").value("GRIS"));
        } finally {
            borrar(LOTE);
        }
    }

    @Test
    @DisplayName("Santiago genera sus cuatro documentos de demostración, con rótulo y sin sello ni firma")
    void documentosGeneradosDeSantiago() throws Exception {
        for (String tipo : new String[] {"PLANO_PERIMETRICO", "MEMORIA_DESCRIPTIVA", "CERTIFICADO_ZONIFICACION", "TASACION"}) {
            byte[] pdf = descargar(SANTIAGO, tipo, comprador()).andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", containsString(SANTIAGO)))
                    .andReturn().getResponse().getContentAsByteArray();
            String texto = texto(pdf);
            assertThat(texto).as(tipo).contains("Partida N.° " + SANTIAGO, "SIN SELLO NI FIRMA");
        }
        assertThat(texto(descargar(SANTIAGO, "PLANO_PERIMETRICO", comprador()).andReturn().getResponse()
                .getContentAsByteArray())).contains("CUADRO DE DATOS TÉCNICOS", "9.00", "18.00");
        assertThat(texto(descargar(SANTIAGO, "TASACION", comprador()).andReturn().getResponse()
                .getContentAsByteArray())).contains("S/ 75,000.00");
    }

    @Test
    @DisplayName("Los lotes de la SBN guardan el plano oficial tal cual; lo que la SBN no publica no tiene archivo")
    void lotesDeLaSbn() throws Exception {
        // El plano de Supe pesa menos que el umbral de optimización de las pruebas: se guarda byte a byte.
        byte[] original = Files.readAllBytes(
                Path.of("src/main/resources/contenido/v0.5/documentos/80194645/plano-perimetrico.pdf"));
        byte[] descargado = descargar(SUPE, "PLANO_PERIMETRICO", comprador()).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(Hashing.sha256(descargado)).isEqualTo(Hashing.sha256(original));
        try (PDDocument doc = Loader.loadPDF(descargar(HUARMEY, "PLANO_PERIMETRICO", comprador())
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray())) {
            assertThat(doc.getNumberOfPages()).isEqualTo(1);
        }
        for (String codigo : new String[] {HUARMEY, SUPE}) {
            for (String tipo : new String[] {"MEMORIA_DESCRIPTIVA", "CERTIFICADO_ZONIFICACION", "TASACION"}) {
                descargar(codigo, tipo, comprador()).andExpect(status().isNotFound());
            }
        }
    }
}
