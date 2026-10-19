package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Expediente técnico de planos: se guarda, se evalúa y se muestra como lámina 2D referencial. */
class PlanosApiTest extends BaseApiTest {

    @Test
    @DisplayName("Cada vivienda trae sus planos por especialidad, y la arquitectónica dice si coincide con el área inscrita")
    void planosDelContenido() throws Exception {
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.expediente.tipoPredio").value("VIVIENDA"))
                .andExpect(jsonPath("$.expediente.areaConstruidaInscrita").value(84.5))
                .andExpect(jsonPath("$.expediente.planos", hasSize(4)))
                .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='ARQUITECTURA')].coincideArea", contains(true)))
                .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='ESTRUCTURAS')].sistemaConstructivoEtiqueta",
                        contains("Albañilería confinada")));
        mvc.perform(get("/api/v1/casos/" + TINGUINA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='ELECTRICAS')].estado", contains("NO_PRESENTADO")))
                .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='SANITARIAS')].estado", contains("NO_PRESENTADO")));
    }

    @Test
    @DisplayName("Un plano arquitectónico con otra área da AMARILLO por discrepancia (RV-05) y se restaura sin pérdidas")
    void discrepanciaDeArea() throws Exception {
        JsonNode original = leer(PARCONA);
        try {
            ObjectNode p = peticion(original);
            for (var plano : (ArrayNode) p.get("planos")) {
                if (plano.get("especialidad").asString().equals("ARQUITECTURA")) ((ObjectNode) plano).put("areaConstruida", 120.00);
            }
            actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                    .andExpect(jsonPath("$.evaluacion.reglasAplicadas", contains("RV-05")))
                    .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='ARQUITECTURA')].coincideArea", contains(false)));
        } finally {
            restaurar(PARCONA, original);
        }
        assertThat(leer(PARCONA).get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
    }

    @Test
    @DisplayName("Un plano repetido, el área fuera de la arquitectura o un tipo de predio con datos inválidos dan 400")
    void entradaInvalida() throws Exception {
        JsonNode original = leer(PARCONA);
        ObjectNode repetido = peticion(original);
        ((ArrayNode) repetido.get("planos")).addObject().put("especialidad", "ELECTRICAS").put("estado", "PRESENTADO");
        actualizarExpediente(PARCONA, revisor(), repetido).andExpect(status().isBadRequest());

        ObjectNode malArea = peticion(original);
        for (var plano : (ArrayNode) malArea.get("planos")) {
            if (plano.get("especialidad").asString().equals("ELECTRICAS")) ((ObjectNode) plano).put("areaConstruida", 10.0);
        }
        actualizarExpediente(PARCONA, revisor(), malArea).andExpect(status().isBadRequest());

        ObjectNode tipoInvalido = peticion(original);
        tipoInvalido.put("tipoPredio", "CASTILLO");
        actualizarExpediente(PARCONA, revisor(), tipoInvalido).andExpect(status().isBadRequest());
        assertThat(leer(PARCONA)).isEqualTo(original);
    }

    @Test
    @DisplayName("Si la petición no trae el tipo de predio, los planos quedan como estaban")
    void sinBloqueTecnicoNoSeToca() throws Exception {
        JsonNode original = leer(TINGUINA);
        ObjectNode p = peticion(original);
        p.remove("tipoPredio");
        p.remove("planos");
        p.remove("areaConstruidaInscrita");
        actualizarExpediente(TINGUINA, revisor(), p).andExpect(status().isOk())
                .andExpect(jsonPath("$.expediente.planos", hasSize(4)))
                .andExpect(jsonPath("$.expediente.tipoPredio").value("VIVIENDA"));
        restaurar(TINGUINA, original);
    }

    @Test
    @DisplayName("«Ver plano 2D» devuelve una lámina PDF referencial; un plano no presentado da 404")
    void laminaReferencial() throws Exception {
        byte[] pdf = mvc.perform(get("/api/v1/casos/" + PARCONA + "/planos/ELECTRICAS/documento")
                        .header("Authorization", comprador()))
                .andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
                .andReturn().getResponse().getContentAsByteArray();
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(new PDFTextStripper().getText(doc)).contains("INSTALACIONES ELÉCTRICAS", "FICTICIO");
        }
        mvc.perform(get("/api/v1/casos/" + TINGUINA + "/planos/ELECTRICAS/documento").header("Authorization", comprador()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/planos/GEOLOGIA/documento").header("Authorization", comprador()))
                .andExpect(status().is4xxClientError());
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/planos/ELECTRICAS/documento")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("El revisor sube el PDF real de un plano: reemplaza la lámina. El comprador no puede; un falso PDF da 422")
    void subirPlano() throws Exception {
        byte[] real = "%PDF-1.4\n%plano real de prueba\n".getBytes();
        var archivo = new MockMultipartFile("documento", "plano.pdf", "application/pdf", real);
        mvc.perform(multipart("/api/v1/casos/" + PARCONA + "/planos/ESTRUCTURAS/documento").file(archivo)
                .header("Authorization", comprador())).andExpect(status().isForbidden());
        var falso = new MockMultipartFile("documento", "plano.pdf", "application/pdf", "no es pdf".getBytes());
        mvc.perform(multipart("/api/v1/casos/" + PARCONA + "/planos/ESTRUCTURAS/documento").file(falso)
                .header("Authorization", revisor())).andExpect(status().isUnprocessableEntity());
        mvc.perform(multipart("/api/v1/casos/" + TINGUINA + "/planos/ELECTRICAS/documento").file(archivo)
                .header("Authorization", revisor())).andExpect(status().isUnprocessableEntity());

        mvc.perform(multipart("/api/v1/casos/" + PARCONA + "/planos/ESTRUCTURAS/documento").file(archivo)
                .header("Authorization", revisor())).andExpect(status().isCreated());
        byte[] servido = mvc.perform(get("/api/v1/casos/" + PARCONA + "/planos/ESTRUCTURAS/documento")
                        .header("Authorization", comprador()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(servido).isEqualTo(real);
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='ESTRUCTURAS')].tieneDocumentoPropio", contains(true)));
        // Dejar el caso como estaba: un plano no presentado pierde su archivo, y volver a presentarlo da la lámina.
        JsonNode actual = leer(PARCONA);
        ObjectNode p = peticion(actual);
        for (var plano : (ArrayNode) p.get("planos")) {
            if (plano.get("especialidad").asString().equals("ESTRUCTURAS")) ((ObjectNode) plano).put("estado", "NO_PRESENTADO");
        }
        actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk());
        for (var plano : (ArrayNode) p.get("planos")) {
            if (plano.get("especialidad").asString().equals("ESTRUCTURAS")) ((ObjectNode) plano).put("estado", "PRESENTADO");
        }
        p.put("versionEsperada", leer(PARCONA).get("expediente").get("version").asLong());
        actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk())
                .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='ESTRUCTURAS')].tieneDocumentoPropio", contains(false)));
    }
}
