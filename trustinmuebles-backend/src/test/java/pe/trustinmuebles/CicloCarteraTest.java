package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * F6: ciclo completo de cartera de punta a punta, con las reglas reales del motor y una base H2 en memoria propia,
 * nueva en cada ejecución (nombre aleatorio): no comparte datos con las demás pruebas ni toca data/.
 * Recorre captación, autorización, publicación, contacto, inspección asignada, informe, subsanación e historial, con
 * los intentos prohibidos de cada rol, y comprueba las invariantes I1 a I14.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:ciclo-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class CicloCarteraTest extends BaseApiTest {
    static final String CASO = "55555555";

    @Autowired Environment entorno;

    ObjectNode expediente() {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "TRANSCRITA_CONOCE_AQUI");
        p.put("numero", CASO);
        p.put("denominacion", "Mz. P Lote 9 · Hab. Urb. Los Sauces · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-10-20");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Inmobiliaria Los Sauces S.A.C. adquirió el predio por compraventa.");
        c.put("titulares", "Inmobiliaria Los Sauces S.A.C. (100 %)");
        p.put("tipoPredio", "VIVIENDA");
        p.put("areaConstruidaInscrita", 120.00);
        ArrayNode planos = p.putArray("planos");
        planos.addObject().put("especialidad", "ARQUITECTURA").put("estado", "PRESENTADO").put("areaConstruida", 120.00);
        planos.addObject().put("especialidad", "ESTRUCTURAS").put("estado", "PRESENTADO");
        planos.addObject().put("especialidad", "ELECTRICAS").put("estado", "NO_PRESENTADO");
        planos.addObject().put("especialidad", "SANITARIAS").put("estado", "NO_PRESENTADO");
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-02");
        return p;
    }

    ObjectNode informe() {
        ObjectNode i = json.createObjectNode();
        i.put("estado", "EMITIDO");
        i.put("resultado", "CON_RIESGO");
        i.put("fechaInspeccion", LocalDate.now().minusDays(1).toString());
        i.put("verifArquitectura", "CONFORME");
        i.put("verifEstructuras", "OBSERVADO");
        i.put("verifElectricas", "CONFORME");
        i.put("verifSanitarias", "CONFORME");
        i.put("conclusiones", "Fisuras en un muro portante; se recomienda un estudio estructural.");
        i.put("profesional", "Nombre enviado por el cliente");
        return i;
    }

    JsonNode evaluacion() throws Exception {
        return leerComo(CASO, revisor()).get("evaluacion");
    }

    int filasHistorial() {
        return jdbc.queryForObject("select count(*) from historial_evaluacion where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)",
                Integer.class, CASO);
    }

    @Test
    @DisplayName("F6: ciclo completo de cartera con intentos prohibidos por rol e invariantes I1 a I14")
    void cicloCompleto() throws Exception {
        String revisor = revisor();
        String gestor = gestor();
        String comprador = comprador();
        String p1 = propietario(1);
        String p2 = propietario(2);
        String esp1 = token("especialista-01");
        String esp2 = token("especialista-02");
        String json = MediaType.APPLICATION_JSON_VALUE;

        // Base nueva y aislada: solo el contenido de demostración, sin nada de otras pruebas.
        assertThat(jdbc.queryForObject("select count(*) from caso_lote", Integer.class)).isEqualTo(10);
        assertThat(jdbc.queryForObject("select count(*) from solicitud_contacto", Integer.class)).isZero();

        // 1. El REVISOR crea el expediente indicando el propietario. Nace en BORRADOR y sin autorización.
        mvc.perform(post("/api/v1/casos").header("Authorization", gestor).contentType(json)
                .content(this.json.writeValueAsString(expediente()))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos").header("Authorization", p2).contentType(json)
                .content(this.json.writeValueAsString(expediente()))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos").header("Authorization", revisor).contentType(json)
                .content(this.json.writeValueAsString(expediente()))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.publicacion.estado").value("BORRADOR"))
                .andExpect(jsonPath("$.publicacion.autorizada").value(false))
                .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                .andExpect(jsonPath("$.evaluacion.reglasAplicadas", contains("RV-04")));
        JsonNode colorInicial = evaluacion();
        assertThat(filasHistorial()).isEqualTo(1);

        mvc.perform(get("/api/v1/casos/" + CASO).header("Authorization", comprador)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/" + CASO).header("Authorization", p1)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/casos/" + CASO + "/publicacion").header("Authorization", gestor))
                .andExpect(status().isUnprocessableEntity()); // I14

        // 2. El propietario autoriza. Ni el revisor ni otro propietario pueden hacerlo (I13).
        mvc.perform(put("/api/v1/casos/" + CASO + "/autorizacion").header("Authorization", revisor))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + CASO + "/autorizacion").header("Authorization", p1))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + CASO + "/autorizacion").header("Authorization", p2))
                .andExpect(status().isOk()).andExpect(jsonPath("$.autorizada").value(true));
        // I13: su única escritura es la autorización.
        actualizarExpediente(CASO, p2, peticion(leerComo(CASO, p2))).andExpect(status().isForbidden());
        var pdf = new MockMultipartFile("documento", "x.pdf", "application/pdf", "%PDF-1.4\n%ciclo\n".getBytes());
        mvc.perform(multipart("/api/v1/casos/" + CASO + "/documento").file(pdf).header("Authorization", p2))
                .andExpect(status().isForbidden());

        // 3. El GESTOR publica (el caso es amarillo: I10). Nadie más puede.
        mvc.perform(post("/api/v1/casos/" + CASO + "/publicacion").header("Authorization", revisor))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + CASO + "/publicacion").header("Authorization", p2))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + CASO + "/publicacion").header("Authorization", gestor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("PUBLICADO"));
        assertThat(evaluacion()).as("I8: autorizar y publicar no cambian A").isEqualTo(colorInicial);

        // 4. El COMPRADOR ve el caso publicado (sin el código del propietario: I11) y pide contacto.
        mvc.perform(get("/api/v1/casos/" + CASO).header("Authorization", comprador)).andExpect(status().isOk())
                .andExpect(jsonPath("$.publicacion.propietarioCodigo").value(nullValue()));
        mvc.perform(get("/api/v1/casos").header("Authorization", comprador))
                .andExpect(jsonPath("$[*].codigo", hasItem(CASO)));
        mvc.perform(post("/api/v1/casos/" + CASO + "/contactos").header("Authorization", revisor).contentType(json)
                .content("{\"motivo\":\"INFORMACION_GENERAL\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + CASO + "/contactos").header("Authorization", comprador).contentType(json)
                .content("{\"motivo\":\"INFORMACION_GENERAL\",\"mensaje\":\"Llámenme\"}"))
                .andExpect(status().isBadRequest()); // I11: sin texto libre
        String contacto = mvc.perform(post("/api/v1/casos/" + CASO + "/contactos").header("Authorization", comprador)
                .contentType(json).content("{\"motivo\":\"CONSULTA_INSPECCION\"}")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.compradorCodigo").value("comprador-01"))
                .andReturn().getResponse().getContentAsString();
        long contactoId = this.json.readTree(contacto).get("id").asLong();
        mvc.perform(post("/api/v1/casos/" + CASO + "/contactos").header("Authorization", comprador).contentType(json)
                .content("{\"motivo\":\"INFORMACION_GENERAL\"}")).andExpect(status().isConflict());

        // 5. El GESTOR marca el contacto como atendido.
        mvc.perform(put("/api/v1/contactos/" + contactoId + "/atencion").header("Authorization", comprador))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/contactos/" + contactoId + "/atencion").header("Authorization", gestor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ATENDIDA"));

        // 6. El COMPRADOR solicita la inspección.
        mvc.perform(post("/api/v1/casos/" + CASO + "/inspeccion/solicitud").header("Authorization", esp1))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + CASO + "/inspeccion/solicitud").header("Authorization", comprador))
                .andExpect(status().isCreated());

        // 7. El GESTOR asigna a especialista-02.
        String asignacion = "{\"especialistaCodigo\":\"especialista-02\"}";
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion/asignacion").header("Authorization", revisor)
                .contentType(json).content(asignacion)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion/asignacion").header("Authorization", gestor)
                .contentType(json).content(asignacion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.especialistaAsignadoCodigo").value("especialista-02"));

        // 8. Solo el especialista asignado emite; la firma sale de su cuenta. B no altera A (I2, RN-10).
        int filasAntesDeB = filasHistorial();
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion").header("Authorization", esp1).contentType(json)
                .content(this.json.writeValueAsString(informe()))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion").header("Authorization", gestor).contentType(json)
                .content(this.json.writeValueAsString(informe()))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion").header("Authorization", esp2).contentType(json)
                .content(this.json.writeValueAsString(informe()))).andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluacionTecnica.estado").value("EMITIDO"))
                .andExpect(jsonPath("$.evaluacionTecnica.riesgoFisicoDetectado").value(true))
                .andExpect(jsonPath("$.evaluacionTecnica.profesional").value("Arq. Perfil Ficticio 02"))
                .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"));
        assertThat(evaluacion()).as("I2: el informe con riesgo no cambia A").isEqualTo(colorInicial);
        assertThat(filasHistorial()).as("I8: contacto, asignación e informe no recalculan").isEqualTo(filasAntesDeB);

        // I3: el checklist (HR y PU incluido) no cambia A.
        JsonNode item = leerComo(CASO, revisor).get("checklist").get(0);
        mvc.perform(patch("/api/v1/casos/" + CASO + "/checklist/" + item.get("id").asLong()).header("Authorization", revisor)
                .contentType(json).content("{\"estado\":\"OBSERVADO\",\"observacion\":\"Pendiente de copia\"}"))
                .andExpect(status().isOk());
        assertThat(evaluacion()).isEqualTo(colorInicial);

        // 9. El REVISOR subsana: incorpora los planos faltantes y adjunta el PDF de uno.
        ObjectNode subsanacion = peticion(leerComo(CASO, revisor));
        for (var plano : (ArrayNode) subsanacion.get("planos")) ((ObjectNode) plano).put("estado", "PRESENTADO");
        actualizarExpediente(CASO, revisor, subsanacion).andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                // I1: verde significa exactamente esto.
                .andExpect(jsonPath("$.evaluacion.etiqueta").value("Sin alertas en los campos evaluados"))
                .andExpect(jsonPath("$.evaluacion.limite", containsString("No certifica saneamiento")));
        mvc.perform(multipart("/api/v1/casos/" + CASO + "/planos/ELECTRICAS/documento").file(pdf)
                .header("Authorization", revisor)).andExpect(status().isCreated());
        assertThat(evaluacion().get("estado").asString()).isEqualTo("VERDE");

        // 10. El historial registra cada recálculo, con su origen y la cuenta que actuó.
        JsonNode historial = this.json.readTree(mvc.perform(get("/api/v1/casos/" + CASO + "/historial")
                .header("Authorization", p2)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(historial).hasSize(3);
        assertThat(historial.get(0).get("origen").asString()).isEqualTo("PARTIDA_TRANSCRITA");
        assertThat(historial.get(0).get("estadoNuevo").asString()).isEqualTo("AMARILLO");
        assertThat(historial.get(1).get("origen").asString()).isEqualTo("PLANO_ADJUNTO");
        assertThat(historial.get(1).get("estadoAnterior").asString()).isEqualTo("AMARILLO");
        assertThat(historial.get(1).get("estadoNuevo").asString()).isEqualTo("VERDE");
        assertThat(historial.get(2).get("origen").asString()).isEqualTo("PLANO_ADJUNTO");
        assertThat(historial.get(2).get("estadoNuevo").asString()).isEqualTo("VERDE");
        historial.forEach(h -> assertThat(h.get("cuentaCodigo").asString()).isEqualTo("revisor-01"));

        // 12. Accesos prohibidos al historial y rutas de edición inexistentes (I12).
        mvc.perform(get("/api/v1/casos/" + CASO + "/historial").header("Authorization", comprador))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/casos/" + CASO + "/historial").header("Authorization", p1))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/casos/" + CASO + "/historial").header("Authorization", revisor))
                .andExpect(status().is4xxClientError());
        assertThat(filasHistorial()).isEqualTo(3);

        // Panel del gestor: el caso nuevo, verde y publicado, sin contactos pendientes ni inspecciones en curso suyas.
        mvc.perform(get("/api/v1/cartera/panel").header("Authorization", comprador)).andExpect(status().isForbidden());
        JsonNode panel = this.json.readTree(mvc.perform(get("/api/v1/cartera/panel").header("Authorization", gestor))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(panel.get("totalCasos").asInt()).isEqualTo(11);
        assertThat(panel.get("porColor").get("VERDE").asInt()).isEqualTo(3);
        assertThat(panel.get("porEstadoPublicacion").get("PUBLICADO").asInt()).isEqualTo(11);
        assertThat(panel.get("contactosPendientes")).isEmpty();
        assertThat(panel.get("inspecciones").toString()).doesNotContain(CASO);

        // I14: si el propietario retira la autorización, el caso deja de estar publicado y el comprador no lo ve.
        mvc.perform(delete("/api/v1/casos/" + CASO + "/autorizacion").header("Authorization", p2))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("RETIRADO"));
        mvc.perform(get("/api/v1/casos/" + CASO).header("Authorization", comprador)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/casos/" + CASO + "/contactos").header("Authorization", comprador).contentType(json)
                .content("{\"motivo\":\"INFORMACION_GENERAL\"}")).andExpect(status().isNotFound());
        assertThat(evaluacion().get("estado").asString()).as("retirar no cambia A").isEqualTo("VERDE");

        // Efectos persistidos.
        assertThat(jdbc.queryForObject("select estado_publicacion || '|' || coalesce(propietario_codigo, '') from "
                + "caso_lote where codigo = ?", String.class, CASO)).isEqualTo("RETIRADO|propietario-02");
        assertThat(jdbc.queryForObject("select especialista_asignado_codigo || '|' || colegiatura from evaluacion_tecnica "
                + "where expediente_id = (select e.id from expediente e join caso_lote c on c.id = e.caso_id "
                + "where c.codigo = ?)", String.class, CASO)).isEqualTo("especialista-02|SIM-CAP-0002");
        assertThat(jdbc.queryForObject("select count(*) from solicitud_contacto where caso_codigo = ? and estado = "
                + "'ATENDIDA' and atendida_por = 'gestor-01'", Integer.class, CASO)).isEqualTo(1);

        // I5 e I6: los módulos respetan sus límites y el backend escucha solo en 127.0.0.1.
        ApplicationModules.of(TrustinmueblesBackendApplication.class).verify();
        assertThat(entorno.getProperty("server.address")).isEqualTo("127.0.0.1");
    }
}
