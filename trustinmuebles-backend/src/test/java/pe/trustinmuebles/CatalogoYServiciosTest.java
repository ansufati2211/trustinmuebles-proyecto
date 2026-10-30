package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v0.6: datos del predio, solicitud de inspección solo del comprador (M5), identidad del especialista desde su cuenta
 * (M8), ítem HR y PU (M9), filtros del catálogo (M13) e invariantes I1 a I4.
 */
class CatalogoYServiciosTest extends BaseApiTest {
    static final String HRPU = "Declaración Jurada Municipal (HR y PU)";

    String especialista() throws Exception {
        return token("especialista-01");
    }

    ResultActions solicitar(String codigo, String autorizacion) throws Exception {
        return mvc.perform(post("/api/v1/casos/" + codigo + "/inspeccion/solicitud").header("Authorization", autorizacion));
    }

    ResultActions emitir(String codigo, String autorizacion, ObjectNode cuerpo) throws Exception {
        return mvc.perform(put("/api/v1/casos/" + codigo + "/inspeccion").header("Authorization", autorizacion)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)));
    }

    ObjectNode informe(String resultado) {
        ObjectNode i = json.createObjectNode();
        i.put("estado", "EMITIDO");
        i.put("resultado", resultado);
        i.put("fechaInspeccion", LocalDate.now().minusDays(1).toString());
        i.put("verifArquitectura", "CONFORME");
        i.put("verifEstructuras", "OBSERVADO");
        i.put("verifElectricas", "OBSERVADO");
        i.put("verifSanitarias", "CONFORME");
        i.put("observaciones", "Fisuras diagonales en muros portantes del primer piso.");
        i.put("conclusiones", "Se requiere un estudio estructural antes de cualquier decisión.");
        return i;
    }

    void limpiarInspeccion(String codigo) {
        jdbc.update("delete from evaluacion_tecnica where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)", codigo);
    }

    List<String> codigos(String consulta) throws Exception {
        String r = mvc.perform(get("/api/v1/casos" + consulta).header("Authorization", comprador()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<String> lista = new ArrayList<>();
        json.readTree(r).forEach(c -> lista.add(c.get("codigo").asString()));
        return lista;
    }

    // ------------------------------------------------------------------ predio e I1

    @Test
    @DisplayName("Cada caso trae tipo de inmueble, distrito, área y precio referencial en soles, en el listado y el detalle")
    void datosDelPredio() throws Exception {
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$.predio.tipoInmueble").value("VIVIENDA_URBANA"))
                .andExpect(jsonPath("$.predio.tipoInmuebleEtiqueta").value("Vivienda urbana"))
                .andExpect(jsonPath("$.predio.distrito").value("Parcona"))
                .andExpect(jsonPath("$.predio.precioReferencial").value(185000.00))
                .andExpect(jsonPath("$.predio.moneda").value("PEN"))
                .andExpect(jsonPath("$.predio.precioNota", containsString("referencial e informativo")));
        mvc.perform(get("/api/v1/casos").header("Authorization", comprador()))
                .andExpect(jsonPath("$[*].predio.distrito", contains("Parcona", "La Tinguiña", "Subtanjalla",
                        "Los Aquijes", "Pueblo Nuevo", "Santiago", "Salas", "San José de los Molinos", "Pachacútec",
                        "Ica")))
                .andExpect(jsonPath("$[?(@.codigo=='" + SANTIAGO + "')].predio.tipoInmueble", contains("LOTE_URBANO")))
                .andExpect(jsonPath("$[*].predio.precioReferencial", everyItem(notNullValue())))
                .andExpect(jsonPath("$[*].predio.areaM2", everyItem(notNullValue())));
    }

    @Test
    @DisplayName("I1: verde significa «Sin alertas en los campos evaluados» y siempre viene con su límite")
    void verdeSignificaSinAlertas() throws Exception {
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                .andExpect(jsonPath("$.evaluacion.etiqueta").value("Sin alertas en los campos evaluados"))
                .andExpect(jsonPath("$.evaluacion.limite", containsString("No certifica saneamiento ni recomienda comprar")));
    }

    // ------------------------------------------------------------------ M5

    @Test
    @DisplayName("M5 e I4: solo el comprador solicita; revisor y especialista reciben 403 y no se guarda nada")
    void soloElCompradorSolicita() throws Exception {
        try {
            solicitar(SANTIAGO, revisor()).andExpect(status().isForbidden());
            solicitar(SANTIAGO, especialista()).andExpect(status().isForbidden());
            assertThat(leer(SANTIAGO).get("evaluacionTecnica").get("estado").asString()).isEqualTo("NO_SOLICITADA");
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
    }

    @Test
    @DisplayName("M5: la solicitud guarda el solicitante de la sesión y la fecha, informa el costo y no se duplica")
    void solicitudRegistraSolicitanteYFecha() throws Exception {
        try {
            solicitar(SANTIAGO, comprador()).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.estado").value("SOLICITADA"))
                    .andExpect(jsonPath("$.solicitanteCodigo").value("comprador-01"))
                    .andExpect(jsonPath("$.fechaSolicitud").value(LocalDate.now().toString()))
                    .andExpect(jsonPath("$.servicio.costoReferencial").value(250.00))
                    .andExpect(jsonPath("$.servicio.moneda").value("PEN"))
                    .andExpect(jsonPath("$.servicio.condiciones", containsString("sin pasarela de pago")));
            mvc.perform(get("/api/v1/casos/" + SANTIAGO).header("Authorization", revisor()))
                    .andExpect(jsonPath("$.evaluacionTecnica.solicitanteCodigo").value("comprador-01"))
                    .andExpect(jsonPath("$.evaluacionTecnica.fechaSolicitud").value(LocalDate.now().toString()));
            solicitar(SANTIAGO, comprador()).andExpect(status().isConflict());
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
    }

    @Test
    @DisplayName("M5: el costo referencial se informa aunque la inspección no esté solicitada")
    void costoAntesDeSolicitar() throws Exception {
        mvc.perform(get("/api/v1/casos/" + SANTIAGO).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacionTecnica.estado").value("NO_SOLICITADA"))
                .andExpect(jsonPath("$.evaluacionTecnica.servicio.costoReferencial").value(250.00));
    }

    // ------------------------------------------------------------------ M8 e I2

    @Test
    @DisplayName("M8: el informe guarda nombre, especialidad y colegiatura de la cuenta aunque el cliente mande otros")
    void identidadDelEspecialistaBloqueada() throws Exception {
        try {
            solicitar(SANTIAGO, comprador()).andExpect(status().isCreated());
            ObjectNode i = informe("CON_OBSERVACIONES");
            i.put("profesional", "Arq. Persona Inventada");
            i.put("colegiatura", "CAP 000001");
            i.put("profesionalEspecialidad", "Arquitecto");
            emitir(SANTIAGO, especialista(), i).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacionTecnica.profesional").value("Ing. Perfil Ficticio 01"))
                    .andExpect(jsonPath("$.evaluacionTecnica.profesionalEspecialidad").value("Ingeniero Civil"))
                    .andExpect(jsonPath("$.evaluacionTecnica.colegiatura").value("CIP N.° SIM-CIP-0001"));
            String guardado = jdbc.queryForObject("select profesional || ' | ' || colegiatura from evaluacion_tecnica "
                    + "where expediente_id = (select e.id from expediente e join caso_lote c on c.id = e.caso_id "
                    + "where c.codigo = ?)", String.class, SANTIAGO);
            assertThat(guardado).isEqualTo("Ing. Perfil Ficticio 01 | CIP N.° SIM-CIP-0001");
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
    }

    @Test
    @DisplayName("M8 e I4: el comprador y el revisor no pueden emitir el informe (403)")
    void otroRolNoEmite() throws Exception {
        try {
            solicitar(SANTIAGO, comprador()).andExpect(status().isCreated());
            emitir(SANTIAGO, comprador(), informe("FAVORABLE")).andExpect(status().isForbidden());
            emitir(SANTIAGO, revisor(), informe("FAVORABLE")).andExpect(status().isForbidden());
            assertThat(leer(SANTIAGO).get("evaluacionTecnica").get("estado").asString()).isEqualTo("SOLICITADA");
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
    }

    @Test
    @DisplayName("I2 (RN-10): un informe con riesgo físico no cambia el color del indicador A")
    void informeConRiesgoNoCambiaElColor() throws Exception {
        try {
            JsonNode antes = leer(SANTIAGO).get("evaluacion");
            solicitar(SANTIAGO, comprador()).andExpect(status().isCreated());
            emitir(SANTIAGO, especialista(), informe("CON_RIESGO")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacionTecnica.riesgoFisicoDetectado").value(true));
            JsonNode despues = leer(SANTIAGO).get("evaluacion");
            assertThat(despues.get("estado").asString()).isEqualTo("VERDE").isEqualTo(antes.get("estado").asString());
            assertThat(despues.get("reglasAplicadas")).isEqualTo(antes.get("reglasAplicadas"));
            assertThat(despues.get("calculadaEn")).as("la evaluación documental ni siquiera se recalcula")
                    .isEqualTo(antes.get("calculadaEn"));
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
    }

    @Test
    @DisplayName("Los informes de demostración los firma la cuenta del especialista, con un comprador como solicitante")
    void informesDeDemostracionFirmados() throws Exception {
        mvc.perform(get("/api/v1/casos/" + SALAS).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacionTecnica.resultado").value("CON_RIESGO"))
                .andExpect(jsonPath("$.evaluacionTecnica.riesgoFisicoDetectado").value(true))
                .andExpect(jsonPath("$.evaluacionTecnica.profesional").value("Ing. Perfil Ficticio 01"))
                .andExpect(jsonPath("$.evaluacionTecnica.solicitanteCodigo").value("comprador-01"));
        mvc.perform(get("/api/v1/casos/" + MOLINOS).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacionTecnica.estado").value("SOLICITADA"))
                .andExpect(jsonPath("$.evaluacionTecnica.solicitanteCodigo").value("comprador-01"))
                .andExpect(jsonPath("$.evaluacionTecnica.profesional").doesNotExist());
    }

    // ------------------------------------------------------------------ M9 e I3

    @Test
    @DisplayName("M9: los 10 casos traen el ítem HR y PU, con estados revisado, pendiente y observado")
    void itemHrPuEnLosDiezCasos() throws Exception {
        assertThat(jdbc.queryForObject("select count(*) from item_checklist where nombre = ?", Integer.class, HRPU))
                .isEqualTo(10);
        assertThat(jdbc.queryForList("select distinct estado from item_checklist where nombre = ?", String.class, HRPU))
                .containsExactlyInAnyOrder("REVISADO", "PENDIENTE", "OBSERVADO");
        assertThat(jdbc.queryForObject("select count(*) from item_checklist where nombre = ? and estado = 'OBSERVADO' "
                + "and observacion is null", Integer.class, HRPU)).as("todo observado explica por qué").isZero();
        mvc.perform(get("/api/v1/casos/" + PACHACUTEC).header("Authorization", comprador()))
                .andExpect(jsonPath("$.checklist[?(@.nombre=='" + HRPU + "')].estado", contains("OBSERVADO")))
                .andExpect(jsonPath("$.checklist[?(@.nombre=='" + HRPU + "')].observacion", contains(containsString("72 m²"))));
    }

    @Test
    @DisplayName("I3: cambiar el ítem HR y PU no cambia el color del indicador A")
    void hrPuNoCambiaElColor() throws Exception {
        JsonNode original = leer(PARCONA);
        JsonNode item = null;
        for (JsonNode i : original.get("checklist")) if (i.get("nombre").asString().equals(HRPU)) item = i;
        assertThat(item).isNotNull();
        long id = item.get("id").asLong();
        try {
            mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/" + id).header("Authorization", revisor())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"estado\":\"OBSERVADO\",\"observacion\":\"PU con área desactualizada\"}"))
                    .andExpect(status().isOk());
            JsonNode despues = leer(PARCONA);
            assertThat(despues.get("evaluacion").get("estado").asString()).isEqualTo("VERDE");
            assertThat(despues.get("evaluacion").get("calculadaEn")).isEqualTo(original.get("evaluacion").get("calculadaEn"));
        } finally {
            mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/" + id).header("Authorization", revisor())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"estado\":\"" + item.get("estado").asString() + "\"}")).andExpect(status().isOk());
        }
    }

    // ------------------------------------------------------------------ M13

    @Test
    @DisplayName("M13: los filtros por tipo, indicador A, indicador B y riesgo físico se combinan")
    void filtrosCombinados() throws Exception {
        assertThat(codigos("?tipoInmueble=LOTE_URBANO")).containsExactly(SANTIAGO);
        assertThat(codigos("?tipoInmueble=VIVIENDA_URBANA&estado=AMARILLO"))
                .containsExactly(TINGUINA, SALAS, PACHACUTEC, ICA);
        assertThat(codigos("?estado=AMARILLO&estadoTecnico=EMITIDO")).containsExactly(TINGUINA, SALAS, ICA);
        assertThat(codigos("?estadoTecnico=INFORME_EMITIDO")).as("alias del estado emitido")
                .containsExactly(PARCONA, TINGUINA, SALAS, ICA);
        assertThat(codigos("?estadoTecnico=NO_SOLICITADA&estado=GRIS")).containsExactly(SUBTANJALLA, LOS_AQUIJES);
        assertThat(codigos("?riesgoFisicoDetectado=true")).containsExactly(SALAS);
        assertThat(codigos("?estado=ROJO&estadoTecnico=SOLICITADA")).containsExactly(MOLINOS);
        assertThat(codigos("?tipoInmueble=LOTE_URBANO&estado=ROJO")).as("sin resultados es una lista vacía").isEmpty();
        assertThat(codigos("")).hasSize(10);
    }

    @Test
    @DisplayName("M13: un valor de filtro desconocido da 400 y explica los valores válidos")
    void filtroInvalido() throws Exception {
        mvc.perform(get("/api/v1/casos?estado=AZUL").header("Authorization", comprador()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("VERDE, AMARILLO, ROJO, GRIS")));
        mvc.perform(get("/api/v1/casos?tipoInmueble=CASTILLO").header("Authorization", comprador()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("M13: el filtro de riesgo físico refleja un informe recién emitido")
    void filtroDeRiesgoSeActualiza() throws Exception {
        try {
            solicitar(SANTIAGO, comprador()).andExpect(status().isCreated());
            emitir(SANTIAGO, especialista(), informe("CON_RIESGO")).andExpect(status().isOk());
            assertThat(codigos("?riesgoFisicoDetectado=true")).containsExactly(SANTIAGO, SALAS);
            assertThat(codigos("?riesgoFisicoDetectado=true&estado=VERDE")).containsExactly(SANTIAGO);
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
        assertThat(codigos("?riesgoFisicoDetectado=true")).containsExactly(SALAS);
    }
}
