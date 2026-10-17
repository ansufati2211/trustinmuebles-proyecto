package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** CP-02 a CP-06 y documentos, contra la API real con el contenido v0.1 cargado. */
class CasosApiTest extends BaseApiTest {

    @Test
    @DisplayName("Contenido v0.1 cargado: 4 casos sintéticos, 13 términos, 1 regla, 2 cuentas")
    void contenidoCargado() {
        assertThat(jdbc.queryForObject("select count(*) from caso_lote", Integer.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where sintetico = true", Integer.class))
                .isEqualTo(4);
        assertThat(jdbc.queryForObject("select count(*) from termino_glosario", Integer.class)).isEqualTo(13);
        assertThat(jdbc.queryForObject("select count(*) from regla where prioridad = 'PRIORITARIA'", Integer.class))
                .as("no hay reglas prioritarias sin revisión especializada").isZero();
        assertThat(jdbc.queryForObject("select estado_revision from regla where codigo = 'RV-01'", String.class))
                .contains("pendiente de revisión especializada");
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(2);
    }

    @Test
    @DisplayName("CP-02 el listado y cada código devuelven sus propios datos")
    void cadaCodigoDevuelveSusDatos() throws Exception {
        mvc.perform(get("/api/v1/casos").header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].codigo", contains("B-01", "B-02", "B-03", "DEMO-01")))
                .andExpect(jsonPath("$[0].estado").value("VERDE"))
                .andExpect(jsonPath("$[0].pendientes").value(1))
                .andExpect(jsonPath("$[2].pendientes").value(2));
        for (String codigo : new String[] {"B-01", "B-02", "B-03", "DEMO-01"}) {
            mvc.perform(get("/api/v1/casos/" + codigo).header("Authorization", comprador()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.codigo").value(codigo))
                    .andExpect(jsonPath("$.sintetico").value(true));
        }
        mvc.perform(get("/api/v1/casos/B-02").header("Authorization", comprador()))
                .andExpect(jsonPath("$.expediente.titularidad").value("Titular Épsilon y Titular Zeta"));
        mvc.perform(get("/api/v1/casos/NO-EXISTE").header("Authorization", comprador()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/..%2Fsecreto").header("Authorization", comprador()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("CP-05a B-01 sin alertas da VERDE con alcance limitado")
    void b01Verde() throws Exception {
        mvc.perform(get("/api/v1/casos/B-01").header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                .andExpect(jsonPath("$.evaluacion.alertas", hasSize(0)))
                .andExpect(jsonPath("$.evaluacion.faltantes", hasSize(0)))
                .andExpect(jsonPath("$.evaluacion.motivos[*].texto",
                        hasItem(containsString("Esto no significa saneamiento"))))
                .andExpect(jsonPath("$.evaluacion.limite", containsString("No certifica saneamiento ni recomienda comprar")))
                .andExpect(jsonPath("$.evaluacion.versionReglas").value("v0.1"));
    }

    @Test
    @DisplayName("B-02 con anotación vigente da AMARILLO y explica el motivo")
    void b02Amarillo() throws Exception {
        mvc.perform(get("/api/v1/casos/B-02").header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                .andExpect(jsonPath("$.evaluacion.alertas", hasSize(1)))
                .andExpect(jsonPath("$.evaluacion.alertas[0].referencia").value("B2"))
                .andExpect(jsonPath("$.evaluacion.reglasAplicadas[0]").value("RV-01"));
    }

    @Test
    @DisplayName("CP-05c B-03 con datos faltantes da GRIS y conserva la alerta B4")
    void b03GrisConservaAlerta() throws Exception {
        mvc.perform(get("/api/v1/casos/B-03").header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("GRIS"))
                .andExpect(jsonPath("$.evaluacion.faltantes", hasItems("Titularidad", "Completitud del extracto")))
                .andExpect(jsonPath("$.evaluacion.alertas[0].referencia").value("B4"))
                .andExpect(jsonPath("$.evaluacion.noDescartaOtras").value(true))
                .andExpect(jsonPath("$.evaluacion.motivos[*].texto", hasItem(containsString("no se descartan otras"))));
    }

    @Test
    @DisplayName("DEMO-01 de familiarización da GRIS por información insuficiente")
    void demoGris() throws Exception {
        mvc.perform(get("/api/v1/casos/DEMO-01").header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("GRIS"))
                .andExpect(jsonPath("$.evaluacion.faltantes", hasItem("Titularidad")))
                .andExpect(jsonPath("$.checklist[0].estado").value("PENDIENTE"));
    }

    @Test
    @DisplayName("CP-04 términos con versión y estado de revisión, y glosario cerrado de solo lectura")
    void glosario() throws Exception {
        mvc.perform(get("/api/v1/casos/B-02").header("Authorization", comprador()))
                .andExpect(jsonPath("$.terminos", not(empty())))
                .andExpect(jsonPath("$.terminos[*].version", everyItem(is("v0.1"))))
                .andExpect(jsonPath("$.terminos[*].estadoRevision", everyItem(is("pendiente de revisión"))))
                .andExpect(jsonPath("$.terminos[*].concepto", hasItems("Anotación", "Vigente", "Titularidad")));
        mvc.perform(get("/api/v1/glosario").header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(13)));
        mvc.perform(post("/api/v1/glosario").header("Authorization", revisor())
                .contentType(MediaType.APPLICATION_JSON).content("{\"concepto\":\"x\",\"explicacion\":\"y\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("CP-03 guardar y releer da lo mismo y sube la versión")
    void guardarPersiste() throws Exception {
        JsonNode original = leer("B-01");
        try {
            ObjectNode p = peticion(original);
            p.put("nota", "Nota de prueba CP-03");
            actualizarExpediente("B-01", revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.expediente.nota").value("Nota de prueba CP-03"));
            JsonNode despues = leer("B-01");
            assertThat(despues.get("expediente").get("nota").asString()).isEqualTo("Nota de prueba CP-03");
            assertThat(despues.get("expediente").get("version").asLong())
                    .isEqualTo(original.get("expediente").get("version").asLong() + 1);
            assertThat(despues.get("evaluacion").get("expedienteVersion").asLong())
                    .isEqualTo(despues.get("expediente").get("version").asLong());
        } finally {
            restaurar("B-01", original);
        }
    }

    @Test
    @DisplayName("CP-03 una entrada inválida da 400 y no cambia nada")
    void entradaInvalidaNoGuarda() throws Exception {
        JsonNode antes = leer("B-02");
        String revisor = revisor();

        ObjectNode vacia = peticion(antes);
        vacia.put("titularidad", "   ");
        actualizarExpediente("B-02", revisor, vacia).andExpect(status().isBadRequest());

        ObjectNode enumMala = peticion(antes);
        enumMala.put("completitud", "CASI");
        actualizarExpediente("B-02", revisor, enumMala).andExpect(status().isBadRequest());

        ObjectNode fechaMala = peticion(antes);
        fechaMala.put("fechaReferencial", "2026-02-31");
        actualizarExpediente("B-02", revisor, fechaMala).andExpect(status().isBadRequest());

        ObjectNode refMala = peticion(antes);
        ((ObjectNode) refMala.get("anotaciones").get(0)).put("referencia", "con espacios");
        actualizarExpediente("B-02", revisor, refMala).andExpect(status().isBadRequest());

        ObjectNode duplicada = peticion(antes);
        ((ObjectNode) duplicada.get("anotaciones").get(1)).put("referencia", "B2");
        actualizarExpediente("B-02", revisor, duplicada).andExpect(status().isBadRequest());

        ObjectNode sinVersion = peticion(antes);
        sinVersion.remove("versionEsperada");
        actualizarExpediente("B-02", revisor, sinVersion).andExpect(status().isBadRequest());

        mvc.perform(put("/api/v1/casos/B-02/expediente").header("Authorization", revisor)
                .contentType(MediaType.APPLICATION_JSON).content("{no es json")).andExpect(status().isBadRequest());

        assertThat(leer("B-02")).as("ningún registro parcial").isEqualTo(antes);
    }

    @Test
    @DisplayName("CP-03 una versión vieja da 409 y no cambia nada")
    void versionVieja() throws Exception {
        JsonNode antes = leer("B-01");
        ObjectNode p = peticion(antes);
        p.put("nota", "no debe guardarse");
        p.put("versionEsperada", antes.get("expediente").get("version").asLong() - 1);
        actualizarExpediente("B-01", revisor(), p).andExpect(status().isConflict());
        assertThat(leer("B-01")).isEqualTo(antes);
    }

    @Test
    @DisplayName("CP-05d cancelar B2 recalcula B-02 a VERDE con la versión de reglas v0.1")
    void cambioValidoRecalcula() throws Exception {
        JsonNode original = leer("B-02");
        try {
            ObjectNode p = peticion(original);
            ((ObjectNode) p.get("anotaciones").get(0)).put("estado", "CANCELADA");
            actualizarExpediente("B-02", revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                    .andExpect(jsonPath("$.evaluacion.versionReglas").value("v0.1"))
                    .andExpect(jsonPath("$.evaluacion.alertas", hasSize(0)));
        } finally {
            restaurar("B-02", original);
        }
        assertThat(leer("B-02").get("evaluacion").get("estado").asString()).isEqualTo("AMARILLO");
    }

    @Test
    @DisplayName("CP-05d una condición no contemplada da GRIS")
    void condicionNoContemplada() throws Exception {
        JsonNode original = leer("B-01");
        try {
            ObjectNode p = peticion(original);
            p.put("condicionRepresentada", "Posesión sin inscripción, según el escenario.");
            actualizarExpediente("B-01", revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("GRIS"))
                    .andExpect(jsonPath("$.evaluacion.motivos[*].tipo", hasItem("CONDICION")));
        } finally {
            restaurar("B-01", original);
        }
    }

    @Test
    @DisplayName("RN-06 el color no se puede fijar a mano: un campo estado enviado se ignora")
    void colorNoSeFijaAMano() throws Exception {
        JsonNode original = leer("B-01");
        try {
            ObjectNode p = peticion(original);
            p.put("estado", "ROJO");
            actualizarExpediente("B-01", revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"));
        } finally {
            restaurar("B-01", original);
        }
    }

    @Test
    @DisplayName("CP-06 el revisor cambia un ítem y persiste; el comprador no")
    void checklistSoloRevisor() throws Exception {
        JsonNode original = leer("B-01");
        long itemId = original.get("checklist").get(2).get("id").asLong();
        try {
            mvc.perform(patch("/api/v1/casos/B-01/checklist/" + itemId).header("Authorization", revisor())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"estado\":\"OBSERVADO\",\"observacion\":\"Falta el anexo\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("OBSERVADO"));
            JsonNode item = leer("B-01").get("checklist").get(2);
            assertThat(item.get("estado").asString()).isEqualTo("OBSERVADO");
            assertThat(item.get("observacion").asString()).isEqualTo("Falta el anexo");

            mvc.perform(patch("/api/v1/casos/B-01/checklist/" + itemId).header("Authorization", comprador())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"REVISADO\"}"))
                    .andExpect(status().isForbidden());
            assertThat(leer("B-01").get("checklist").get(2).get("estado").asString()).isEqualTo("OBSERVADO");

            // El checklist no cambia el color del semáforo.
            assertThat(leer("B-01").get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
        } finally {
            mvc.perform(patch("/api/v1/casos/B-01/checklist/" + itemId).header("Authorization", revisor())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"PENDIENTE\"}"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("CP-06 un ítem de otro caso o un estado inválido no se aceptan")
    void checklistValidaPertenenciaYEstado() throws Exception {
        long itemDeB02 = leer("B-02").get("checklist").get(0).get("id").asLong();
        String revisor = revisor();
        mvc.perform(patch("/api/v1/casos/B-01/checklist/" + itemDeB02).header("Authorization", revisor)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"REVISADO\"}"))
                .andExpect(status().isNotFound());
        long itemDeB01 = leer("B-01").get("checklist").get(0).get("id").asLong();
        mvc.perform(patch("/api/v1/casos/B-01/checklist/" + itemDeB01).header("Authorization", revisor)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"APROBADO_LEGALMENTE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Documento: cada caso trae su PDF sintético y el comprador lo puede ver")
    void documentoDelCaso() throws Exception {
        byte[] pdf = mvc.perform(get("/api/v1/casos/B-02/documento").header("Authorization", comprador()))
                .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", containsString("sandbox")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
        mvc.perform(get("/api/v1/casos/B-02/documento")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Documento: el revisor sube un PDF válido; un falso PDF se rechaza")
    void subirDocumento() throws Exception {
        String revisor = revisor();
        var falso = new MockMultipartFile("documento", "x.pdf", "application/pdf", "esto no es un pdf".getBytes());
        mvc.perform(multipart("/api/v1/casos/DEMO-01/documento").file(falso).header("Authorization", revisor))
                .andExpect(status().isUnprocessableEntity());
        var svg = new MockMultipartFile("documento", "x.svg", "image/svg+xml", "<svg onload=alert(1)/>".getBytes());
        mvc.perform(multipart("/api/v1/casos/DEMO-01/documento").file(svg).header("Authorization", revisor))
                .andExpect(status().isUnprocessableEntity());
        var bueno = new MockMultipartFile("documento", "demo.pdf", "application/pdf",
                "%PDF-1.4\n%sintetico de prueba\n".getBytes());
        mvc.perform(multipart("/api/v1/casos/DEMO-01/documento").file(bueno).header("Authorization", revisor))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.codigo").value("DEMO-01"))
                .andExpect(jsonPath("$.sha256", hasLength(64)));
    }
}
