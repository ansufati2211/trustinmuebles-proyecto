package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** CP-02 a CP-06 y documentos, contra la API real con el contenido v0.2 cargado. */
class CasosApiTest extends BaseApiTest {

    private String textoDelPdf(String partida) throws Exception {
        byte[] pdf = mvc.perform(get("/api/v1/casos/" + partida + "/documento").header("Authorization", comprador()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        try (var doc = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    @Test
    @DisplayName("Contenido v0.3 cargado: 4 casos simulados, 44 términos, 9 reglas (3 prioritarias), 3 cuentas")
    void contenidoCargado() {
        assertThat(jdbc.queryForObject("select count(*) from caso_lote", Integer.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where sintetico = true", Integer.class))
                .isEqualTo(4);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo not like 'SIM-%'", Integer.class))
                .as("toda partida lleva el prefijo SIM- para no confundirse con una real").isZero();
        assertThat(jdbc.queryForObject("select count(*) from termino_glosario", Integer.class)).isEqualTo(44);
        assertThat(jdbc.queryForObject("select count(*) from regla where version = 'v0.3'", Integer.class)).isEqualTo(9);
        assertThat(jdbc.queryForObject("select count(*) from regla where prioridad = 'PRIORITARIA'", Integer.class))
                .isEqualTo(3);
        assertThat(jdbc.queryForObject(
                "select count(*) from regla where estado_revision not like '%pendiente de revisión especializada%'",
                Integer.class)).as("toda regla está rotulada como borrador").isZero();
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(3);
    }

    @Test
    @DisplayName("CP-02 el listado y cada código devuelven sus propios datos")
    void cadaCodigoDevuelveSusDatos() throws Exception {
        mvc.perform(get("/api/v1/casos").header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].codigo", contains(PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES)))
                .andExpect(jsonPath("$[0].denominacion").value("Mz. F Lote 7 · Hab. Urb. Santa Elvira · Parcona, Ica"))
                .andExpect(jsonPath("$[0].estado").value("VERDE"))
                .andExpect(jsonPath("$[0].pendientes").value(1))
                .andExpect(jsonPath("$[2].pendientes").value(2));
        for (String codigo : new String[] {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES}) {
            mvc.perform(get("/api/v1/casos/" + codigo).header("Authorization", comprador()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.codigo").value(codigo))
                    .andExpect(jsonPath("$.sintetico").value(true));
        }
        mvc.perform(get("/api/v1/casos/" + TINGUINA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.expediente.titularidad",
                        containsString("Marco Antonio Quispe Huamaní (50 %) y Lucía Fernanda Torres Gutiérrez (50 %)")));
        mvc.perform(get("/api/v1/casos/NO-EXISTE").header("Authorization", comprador()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/..%2Fsecreto").header("Authorization", comprador()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("Los textos visibles no delatan el diseño del estudio")
    void sinRastrosDelEstudio() throws Exception {
        String lista = mvc.perform(get("/api/v1/casos").header("Authorization", comprador()))
                .andReturn().getResponse().getContentAsString().toLowerCase();
        assertThat(lista).doesNotContain("postest", "pretest", "forma b", "forma a", "sintético de",
                "práctica", "simulad", "mvp", "ejemplo", "escenario", "académic");
        for (String codigo : new String[] {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES}) {
            // El término «Documento simulado» del glosario se queda; se revisan el expediente, la evaluación y el checklist.
            ObjectNode detalle = (ObjectNode) leer(codigo).deepCopy();
            detalle.remove("terminos");
            String texto = detalle.toString().toLowerCase();
            assertThat(texto).doesNotContain("postest", "pretest", "forma b", "titular alfa", "titular delta",
                    "práctica", "simulad", "mvp", "ejemplo", "escenario", "académic");
        }
    }

    @Test
    @DisplayName("CP-05a Parcona: hipoteca cancelada y datos completos da VERDE con alcance limitado")
    void parconaVerde() throws Exception {
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                .andExpect(jsonPath("$.evaluacion.alertas", hasSize(0)))
                .andExpect(jsonPath("$.evaluacion.faltantes", hasSize(0)))
                .andExpect(jsonPath("$.expediente.titularidad").value("Rosa Elena Cárdenas Vilca (100 %)"))
                .andExpect(jsonPath("$.expediente.asientos", hasSize(4)))
                .andExpect(jsonPath("$.expediente.asientos[?(@.referencia=='D00001')].estado", contains("CANCELADA")))
                .andExpect(jsonPath("$.evaluacion.motivos[*].texto",
                        hasItem(containsString("Esto no significa saneamiento"))))
                .andExpect(jsonPath("$.evaluacion.limite", containsString("No certifica saneamiento ni recomienda comprar")))
                .andExpect(jsonPath("$.evaluacion.versionReglas").value("v0.3"));
    }

    @Test
    @DisplayName("La Tinguiña: hipoteca vigente da AMARILLO; el embargo cancelado y la copropiedad no alertan")
    void tinguinaAmarillo() throws Exception {
        mvc.perform(get("/api/v1/casos/" + TINGUINA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                // Hipoteca vigente (RV-02) y los dos planos de instalaciones que faltan (RV-04).
                .andExpect(jsonPath("$.evaluacion.alertas", hasSize(3)))
                .andExpect(jsonPath("$.evaluacion.alertas[0].referencia").value("D00001"))
                .andExpect(jsonPath("$.evaluacion.alertas[0].regla").value("RV-02"))
                .andExpect(jsonPath("$.evaluacion.reglasAplicadas", contains("RV-02", "RV-04")))
                .andExpect(jsonPath("$.expediente.asientos[?(@.referencia=='D00002')].estado", contains("CANCELADA")));
    }

    @Test
    @DisplayName("CP-05c Subtanjalla: extracto parcial da GRIS y conserva la alerta prioritaria de la demanda")
    void subtanjallaGrisConservaAlerta() throws Exception {
        mvc.perform(get("/api/v1/casos/" + SUBTANJALLA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("GRIS"))
                .andExpect(jsonPath("$.expediente.titularidad").value("desconocido"))
                .andExpect(jsonPath("$.evaluacion.faltantes", hasItems("Titularidad", "Completitud del extracto")))
                .andExpect(jsonPath("$.evaluacion.alertas[0].referencia").value("D00001"))
                .andExpect(jsonPath("$.evaluacion.alertas[0].regla").value("RP-02"))
                .andExpect(jsonPath("$.evaluacion.alertas[0].prioridad").value("PRIORITARIA"))
                .andExpect(jsonPath("$.evaluacion.noDescartaOtras").value(true))
                .andExpect(jsonPath("$.evaluacion.motivos[*].texto", hasItem(containsString("no se descartan otras"))));
    }

    @Test
    @DisplayName("Sin copia literal (Los Aquijes) da GRIS por información insuficiente")
    void sinCopiaLiteralGris() throws Exception {
        mvc.perform(get("/api/v1/casos/" + LOS_AQUIJES).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("GRIS"))
                .andExpect(jsonPath("$.evaluacion.faltantes", hasItem("Titularidad")))
                .andExpect(jsonPath("$.checklist[0].estado").value("PENDIENTE"));
    }

    @Test
    @DisplayName("CP-04 términos con versión y estado de revisión, y glosario cerrado de solo lectura")
    void glosario() throws Exception {
        mvc.perform(get("/api/v1/casos/" + TINGUINA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.terminos", not(empty())))
                .andExpect(jsonPath("$.terminos[*].version", everyItem(is("v0.3"))))
                .andExpect(jsonPath("$.terminos[*].estadoRevision", everyItem(is("pendiente de revisión"))))
                .andExpect(jsonPath("$.terminos[*].concepto", hasItems("Hipoteca", "Embargo", "Copropiedad", "Cancelación")));
        mvc.perform(get("/api/v1/glosario").header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(44)));
        mvc.perform(post("/api/v1/glosario").header("Authorization", revisor())
                .contentType(MediaType.APPLICATION_JSON).content("{\"concepto\":\"x\",\"explicacion\":\"y\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("CP-03 guardar y releer da lo mismo y sube la versión")
    void guardarPersiste() throws Exception {
        JsonNode original = leer(PARCONA);
        try {
            ObjectNode p = peticion(original);
            p.put("nota", "Nota de prueba CP-03");
            actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.expediente.nota").value("Nota de prueba CP-03"));
            JsonNode despues = leer(PARCONA);
            assertThat(despues.get("expediente").get("nota").asString()).isEqualTo("Nota de prueba CP-03");
            assertThat(despues.get("expediente").get("version").asLong())
                    .isEqualTo(original.get("expediente").get("version").asLong() + 1);
            assertThat(despues.get("evaluacion").get("expedienteVersion").asLong())
                    .isEqualTo(despues.get("expediente").get("version").asLong());
        } finally {
            restaurar(PARCONA, original);
        }
    }

    @Test
    @DisplayName("CP-03 una entrada inválida da 400 y no cambia nada")
    void entradaInvalidaNoGuarda() throws Exception {
        JsonNode antes = leer(TINGUINA);
        String revisor = revisor();

        ObjectNode vacia = peticion(antes);
        vacia.put("condicionRepresentada", "   ");
        actualizarExpediente(TINGUINA, revisor, vacia).andExpect(status().isBadRequest());

        ObjectNode enumMala = peticion(antes);
        enumMala.put("completitud", "CASI");
        actualizarExpediente(TINGUINA, revisor, enumMala).andExpect(status().isBadRequest());

        ObjectNode fechaMala = peticion(antes);
        fechaMala.put("fechaReferencial", "2026-02-31");
        actualizarExpediente(TINGUINA, revisor, fechaMala).andExpect(status().isBadRequest());

        ObjectNode areaMala = peticion(antes);
        areaMala.put("areaM2", -5);
        actualizarExpediente(TINGUINA, revisor, areaMala).andExpect(status().isBadRequest());

        ObjectNode refMala = peticion(antes);
        ((ObjectNode) refMala.get("asientos").get(0)).put("referencia", "con espacios");
        actualizarExpediente(TINGUINA, revisor, refMala).andExpect(status().isBadRequest());

        ObjectNode rubroMalo = peticion(antes);
        ((ObjectNode) rubroMalo.get("asientos").get(0)).put("referencia", "A00001");
        actualizarExpediente(TINGUINA, revisor, rubroMalo).andExpect(status().isBadRequest());

        ObjectNode duplicada = peticion(antes);
        ((ObjectNode) duplicada.get("asientos").get(1)).put("referencia", "C00001");
        actualizarExpediente(TINGUINA, revisor, duplicada).andExpect(status().isBadRequest());

        ObjectNode sinVersion = peticion(antes);
        sinVersion.remove("versionEsperada");
        actualizarExpediente(TINGUINA, revisor, sinVersion).andExpect(status().isBadRequest());

        // Reglas de la partida: cada una debe rechazarse con 400 y un mensaje claro.
        ObjectNode sinTitulares = peticion(antes);
        ((ObjectNode) sinTitulares.get("asientos").get(0)).remove("titulares");
        actualizarExpediente(TINGUINA, revisor, sinTitulares).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("debe indicar los titulares")));

        ObjectNode gravamenSinEstado = peticion(antes);
        ((ObjectNode) gravamenSinEstado.get("asientos").get(1)).remove("estado");
        actualizarExpediente(TINGUINA, revisor, gravamenSinEstado).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("debe indicar su estado")));

        // Asientos de La Tinguiña, en orden: 0 C00001, 1 D00001, 2 D00002 (cancelado), 3 E00001 (cancela D00002).
        ObjectNode canceladoSinE = peticion(antes);
        ((tools.jackson.databind.node.ArrayNode) canceladoSinE.get("asientos")).remove(3); // quita E00001
        actualizarExpediente(TINGUINA, revisor, canceladoSinE).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("ningún asiento E lo cancela")));

        ObjectNode cancelaInexistente = peticion(antes);
        ((ObjectNode) cancelaInexistente.get("asientos").get(3)).put("canceloNumero", "D00009");
        actualizarExpediente(TINGUINA, revisor, cancelaInexistente).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("no existe en la partida")));

        mvc.perform(put("/api/v1/casos/" + TINGUINA + "/expediente").header("Authorization", revisor)
                .contentType(MediaType.APPLICATION_JSON).content("{no es json")).andExpect(status().isBadRequest());

        assertThat(leer(TINGUINA)).as("ningún registro parcial").isEqualTo(antes);
    }

    @Test
    @DisplayName("CP-03 una versión vieja da 409 y no cambia nada")
    void versionVieja() throws Exception {
        JsonNode antes = leer(PARCONA);
        ObjectNode p = peticion(antes);
        p.put("nota", "no debe guardarse");
        p.put("versionEsperada", antes.get("expediente").get("version").asLong() - 1);
        actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isConflict());
        assertThat(leer(PARCONA)).isEqualTo(antes);
    }

    @Test
    @DisplayName("CP-05d cancelar la hipoteca quita su alerta; con los planos de instalaciones presentados, La Tinguiña pasa a VERDE")
    void cancelarLaHipotecaRecalcula() throws Exception {
        JsonNode original = leer(TINGUINA);
        try {
            ObjectNode p = peticion(original);
            agregarAsiento(p, "E00002", "CANCELACION", null,
                    "Se cancela la hipoteca inscrita en el asiento D00001 por pago total de la deuda.", "D00001");
            // Sin la hipoteca sigue AMARILLO: faltan los planos de II.EE. y II.SS. (RV-04).
            actualizarExpediente(TINGUINA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                    .andExpect(jsonPath("$.evaluacion.versionReglas").value("v0.3"))
                    .andExpect(jsonPath("$.evaluacion.reglasAplicadas", contains("RV-04")))
                    .andExpect(jsonPath("$.expediente.asientos[?(@.referencia=='D00001')].estado", contains("CANCELADA")));

            ObjectNode completo = peticion(leer(TINGUINA));
            for (var plano : (tools.jackson.databind.node.ArrayNode) completo.get("planos")) {
                if (plano.get("estado").asString().equals("NO_PRESENTADO")) ((ObjectNode) plano).put("estado", "PRESENTADO");
            }
            actualizarExpediente(TINGUINA, revisor(), completo).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                    .andExpect(jsonPath("$.evaluacion.alertas", hasSize(0)));
        } finally {
            restaurar(TINGUINA, original);
        }
        assertThat(leer(TINGUINA).get("evaluacion").get("estado").asString()).isEqualTo("AMARILLO");
    }

    @Test
    @DisplayName("CP-05b un embargo vigente da ROJO con la regla RP-01; al cancelarlo vuelve a VERDE (tabla borrador v0.2)")
    void embargoVigenteDaRojo() throws Exception {
        JsonNode original = leer(PARCONA);
        try {
            ObjectNode p = peticion(original);
            agregarAsiento(p, "D00002", "EMBARGO", "VIGENTE",
                    "Embargo en forma de inscripción hasta por la suma de S/ 9,000.00.", null);
            actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("ROJO"))
                    .andExpect(jsonPath("$.evaluacion.alertas[0].regla").value("RP-01"))
                    .andExpect(jsonPath("$.evaluacion.alertas[0].prioridad").value("PRIORITARIA"));
        } finally {
            restaurar(PARCONA, original);
        }
        assertThat(leer(PARCONA).get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
    }

    @Test
    @DisplayName("La titularidad sale del último asiento C y no se puede escribir a mano")
    void titularidadSeDerivaDelAsientoC() throws Exception {
        JsonNode original = leer(PARCONA);
        try {
            ObjectNode p = peticion(original);
            p.put("titularidad", "Persona que no consta en la partida"); // campo que no existe en el contrato: se ignora
            ((ObjectNode) p.get("asientos").get(0)).put("titulares", "Julia Mariela Ayala Condori (100 %)");
            actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.expediente.titularidad").value("Julia Mariela Ayala Condori (100 %)"));
        } finally {
            restaurar(PARCONA, original);
        }
        assertThat(leer(PARCONA).get("expediente").get("titularidad").asString())
                .isEqualTo("Rosa Elena Cárdenas Vilca (100 %)");
    }

    @Test
    @DisplayName("CP-05d una condición no contemplada da GRIS")
    void condicionNoContemplada() throws Exception {
        JsonNode original = leer(PARCONA);
        try {
            ObjectNode p = peticion(original);
            p.put("condicionRepresentada", "Posesión sin inscripción.");
            actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("GRIS"))
                    .andExpect(jsonPath("$.evaluacion.motivos[*].tipo", hasItem("CONDICION")));
        } finally {
            restaurar(PARCONA, original);
        }
    }

    @Test
    @DisplayName("RN-06 el color no se puede fijar a mano: un campo estado enviado se ignora")
    void colorNoSeFijaAMano() throws Exception {
        JsonNode original = leer(PARCONA);
        try {
            ObjectNode p = peticion(original);
            p.put("estado", "ROJO");
            actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"));
        } finally {
            restaurar(PARCONA, original);
        }
    }

    @Test
    @DisplayName("CP-06 el revisor cambia un ítem y persiste; el comprador no")
    void checklistSoloRevisor() throws Exception {
        JsonNode original = leer(PARCONA);
        long itemId = original.get("checklist").get(2).get("id").asLong();
        try {
            mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/" + itemId).header("Authorization", revisor())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"estado\":\"OBSERVADO\",\"observacion\":\"Falta el título\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("OBSERVADO"));
            JsonNode item = leer(PARCONA).get("checklist").get(2);
            assertThat(item.get("estado").asString()).isEqualTo("OBSERVADO");
            assertThat(item.get("observacion").asString()).isEqualTo("Falta el título");

            mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/" + itemId).header("Authorization", comprador())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"REVISADO\"}"))
                    .andExpect(status().isForbidden());
            assertThat(leer(PARCONA).get("checklist").get(2).get("estado").asString()).isEqualTo("OBSERVADO");

            // El checklist no cambia el color del semáforo.
            assertThat(leer(PARCONA).get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
        } finally {
            mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/" + itemId).header("Authorization", revisor())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"PENDIENTE\"}"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("CP-06 un ítem de otro caso o un estado inválido no se aceptan")
    void checklistValidaPertenenciaYEstado() throws Exception {
        long itemDeOtro = leer(TINGUINA).get("checklist").get(0).get("id").asLong();
        String revisor = revisor();
        mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/" + itemDeOtro).header("Authorization", revisor)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"REVISADO\"}"))
                .andExpect(status().isNotFound());
        long itemPropio = leer(PARCONA).get("checklist").get(0).get("id").asLong();
        mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/" + itemPropio).header("Authorization", revisor)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"APROBADO_LEGALMENTE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Documento: cada caso trae su copia literal simulada, con marca, partida y rubros")
    void documentoDelCaso() throws Exception {
        byte[] pdf = mvc.perform(get("/api/v1/casos/" + TINGUINA + "/documento").header("Authorization", comprador()))
                .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", containsString("sandbox")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
        String texto = textoDelPdf(TINGUINA);
        assertThat(texto).contains("Partida N.° SIM-11052690", "COPIA LITERAL SIMULADA", "TÍTULOS DE DOMINIO",
                "GRAVÁMENES Y CARGAS", "CANCELACIONES", "D00001 · HIPOTECA", "D00002 · EMBARGO", "E00001 · CANCELACIÓN",
                "Marco Antonio Quispe Huamaní", "no está firmado");
        mvc.perform(get("/api/v1/casos/" + TINGUINA + "/documento")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Documento: el extracto parcial lo dice y no inventa el rubro de títulos de dominio")
    void documentoDelExtractoParcial() throws Exception {
        String texto = textoDelPdf(SUBTANJALLA);
        assertThat(texto).contains("EXTRACTO PARCIAL", "No incluido en este extracto.", "D00001 · ANOTACIÓN DE DEMANDA");
        assertThat(texto).doesNotContain("C00001");
    }

    @Test
    @DisplayName("Documento: si lo genera el sistema, se regenera al guardar y refleja los asientos nuevos")
    void documentoGeneradoSeRegenera() throws Exception {
        JsonNode original = leer(PARCONA);
        assertThat(original.get("expediente").get("documentoGenerado").asBoolean()).isTrue();
        assertThat(textoDelPdf(PARCONA)).doesNotContain("D00002");
        try {
            ObjectNode p = peticion(original);
            agregarAsiento(p, "D00002", "EMBARGO", "VIGENTE", "Embargo en forma de inscripción hasta por S/ 9,000.00.", null);
            actualizarExpediente(PARCONA, revisor(), p).andExpect(status().isOk());
            assertThat(textoDelPdf(PARCONA)).contains("D00002 · EMBARGO", "S/ 9,000.00");
        } finally {
            restaurar(PARCONA, original);
        }
        assertThat(textoDelPdf(PARCONA)).doesNotContain("D00002");
    }

    @Test
    @DisplayName("Documento: el revisor sube un PDF propio y deja de regenerarse; un falso PDF se rechaza")
    void subirDocumento() throws Exception {
        String revisor = revisor();
        var falso = new MockMultipartFile("documento", "x.pdf", "application/pdf", "esto no es un pdf".getBytes());
        mvc.perform(multipart("/api/v1/casos/" + LOS_AQUIJES + "/documento").file(falso).header("Authorization", revisor))
                .andExpect(status().isUnprocessableEntity());
        var svg = new MockMultipartFile("documento", "x.svg", "image/svg+xml", "<svg onload=alert(1)/>".getBytes());
        mvc.perform(multipart("/api/v1/casos/" + LOS_AQUIJES + "/documento").file(svg).header("Authorization", revisor))
                .andExpect(status().isUnprocessableEntity());
        var bueno = new MockMultipartFile("documento", "demo.pdf", "application/pdf",
                "%PDF-1.4\n%simulado de prueba\n".getBytes());
        mvc.perform(multipart("/api/v1/casos/" + LOS_AQUIJES + "/documento").file(bueno).header("Authorization", revisor))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.codigo").value(LOS_AQUIJES))
                .andExpect(jsonPath("$.sha256", hasLength(64)));
        JsonNode despues = leer(LOS_AQUIJES);
        assertThat(despues.get("evaluacion").get("expedienteVersion").asLong())
                .as("la evaluación corresponde a la versión vigente del expediente")
                .isEqualTo(despues.get("expediente").get("version").asLong());
        assertThat(despues.get("expediente").get("documentoGenerado").asBoolean())
                .as("un PDF propio ya no se pisa al guardar").isFalse();
    }
}
