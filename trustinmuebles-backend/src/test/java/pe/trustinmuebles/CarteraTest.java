package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v0.7 (F3): contacto del comprador, asignación del especialista y panel de cartera. Invariantes I8 (contacto y
 * asignación no cambian el color), I10 (contactar no depende del color) e I11 (sin texto libre ni datos personales).
 */
class CarteraTest extends BaseApiTest {

    String especialista(int n) throws Exception {
        return token("especialista-0" + n);
    }

    ResultActions contactar(String codigo, String auth, String cuerpo) throws Exception {
        return mvc.perform(post("/api/v1/casos/" + codigo + "/contactos").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }

    ResultActions atender(long id, String auth) throws Exception {
        return mvc.perform(put("/api/v1/contactos/" + id + "/atencion").header("Authorization", auth));
    }

    ResultActions asignar(String codigo, String auth, String especialista) throws Exception {
        return mvc.perform(put("/api/v1/casos/" + codigo + "/inspeccion/asignacion").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"especialistaCodigo\":\"" + especialista + "\"}"));
    }

    ResultActions emitir(String codigo, String auth, ObjectNode cuerpo) throws Exception {
        return mvc.perform(put("/api/v1/casos/" + codigo + "/inspeccion").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)));
    }

    ObjectNode informe(String estado) {
        ObjectNode i = json.createObjectNode();
        i.put("estado", estado);
        i.put("resultado", "FAVORABLE");
        i.put("fechaInspeccion", LocalDate.now().minusDays(1).toString());
        i.put("verifArquitectura", "CONFORME");
        i.put("verifEstructuras", "CONFORME");
        i.put("verifElectricas", "CONFORME");
        i.put("verifSanitarias", "CONFORME");
        i.put("conclusiones", "Sin observaciones relevantes en la inspección visual.");
        return i;
    }

    long id(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    void limpiarInspeccion(String codigo) {
        jdbc.update("delete from evaluacion_tecnica where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)", codigo);
    }

    int historial(String codigo) {
        return jdbc.queryForObject("select count(*) from historial_evaluacion where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)",
                Integer.class, codigo);
    }

    // ------------------------------------------------------------------ permisos

    @Test
    @DisplayName("Permisos: cada endpoint nuevo de F3 da 403 a los roles que no corresponden")
    void permisosPorRol() throws Exception {
        String motivo = "{\"motivo\":\"INFORMACION_GENERAL\"}";
        for (String auth : new String[] {revisor(), gestor(), especialista(1), propietario(1)}) {
            contactar(PARCONA, auth, motivo).andExpect(status().isForbidden());
        }
        for (String auth : new String[] {comprador(), revisor(), especialista(1), propietario(1)}) {
            mvc.perform(get("/api/v1/contactos").header("Authorization", auth)).andExpect(status().isForbidden());
            atender(1, auth).andExpect(status().isForbidden());
            mvc.perform(get("/api/v1/cartera/panel").header("Authorization", auth)).andExpect(status().isForbidden());
            asignar(MOLINOS, auth, "especialista-02").andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/v1/cartera/panel")).andExpect(status().isUnauthorized());
        contactar(PARCONA, "", motivo).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("select count(*) from evaluacion_tecnica where especialista_asignado_codigo "
                + "is not null", Integer.class)).isZero();
    }

    // ------------------------------------------------------------------ contacto

    @Test
    @DisplayName("I10 e I8: el comprador pide contacto sobre un caso rojo publicado; la duplicada pendiente da 409")
    void contactoSobreRojo() throws Exception {
        JsonNode antes = leerComo(PUEBLO_NUEVO, revisor()).get("evaluacion");
        assertThat(antes.get("estado").asString()).isEqualTo("ROJO");
        int filas = historial(PUEBLO_NUEVO);

        ResultActions r = contactar(PUEBLO_NUEVO, comprador(), "{\"motivo\":\"CONSULTA_DOCUMENTOS\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.compradorCodigo").value("comprador-01"))
                .andExpect(jsonPath("$.motivo").value("CONSULTA_DOCUMENTOS"))
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.creadaEn").value(notNullValue()));
        long id = id(r);
        contactar(PUEBLO_NUEVO, comprador(), "{\"motivo\":\"INFORMACION_GENERAL\"}").andExpect(status().isConflict());

        atender(id, gestor()).andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ATENDIDA"))
                .andExpect(jsonPath("$.atendidaPor").value("gestor-01"));
        atender(id, gestor()).andExpect(status().isConflict());
        // Atendida la anterior, puede volver a pedir contacto.
        long otra = id(contactar(PUEBLO_NUEVO, comprador(), "{\"motivo\":\"INFORMACION_GENERAL\"}")
                .andExpect(status().isCreated()));
        atender(otra, gestor()).andExpect(status().isOk());
        atender(999999, gestor()).andExpect(status().isNotFound());

        assertThat(leerComo(PUEBLO_NUEVO, revisor()).get("evaluacion")).isEqualTo(antes);
        assertThat(historial(PUEBLO_NUEVO)).isEqualTo(filas);
    }

    @Test
    @DisplayName("I11: un motivo fuera de la lista, la falta de motivo o un texto libre dan 400 y no guardan nada")
    void motivoCerrado() throws Exception {
        int antes = jdbc.queryForObject("select count(*) from solicitud_contacto", Integer.class);
        contactar(PARCONA, comprador(), "{\"motivo\":\"QUIERO_COMPRAR\"}").andExpect(status().isBadRequest());
        contactar(PARCONA, comprador(), "{}").andExpect(status().isBadRequest());
        contactar(PARCONA, comprador(), "{\"motivo\":\"INFORMACION_GENERAL\",\"mensaje\":\"Llamar al 987654321\"}")
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from solicitud_contacto", Integer.class)).isEqualTo(antes);
        assertThat(jdbc.queryForList("select column_name from information_schema.columns "
                + "where table_name = 'solicitud_contacto'", String.class))
                .as("no hay columnas de texto libre ni de datos personales")
                .doesNotContain("mensaje", "texto", "nombre", "dni", "telefono");
    }

    @Test
    @DisplayName("Un caso no publicado no admite contacto (404), igual que en el catálogo")
    void contactoSoloPublicado() throws Exception {
        try {
            mvc.perform(delete("/api/v1/casos/" + SANTIAGO + "/publicacion").header("Authorization", gestor()))
                    .andExpect(status().isOk());
            contactar(SANTIAGO, comprador(), "{\"motivo\":\"INFORMACION_GENERAL\"}").andExpect(status().isNotFound());
            contactar("SIM-00000000", comprador(), "{\"motivo\":\"INFORMACION_GENERAL\"}")
                    .andExpect(status().isNotFound());
        } finally {
            mvc.perform(post("/api/v1/casos/" + SANTIAGO + "/publicacion").header("Authorization", gestor()));
        }
    }

    // ------------------------------------------------------------------ asignación

    @Test
    @DisplayName("Asignación: con especialista asignado, otro especialista recibe 403 y el asignado firma con su cuenta")
    void soloElAsignadoEmite() throws Exception {
        try {
            JsonNode antes = leerComo(SANTIAGO, revisor()).get("evaluacion");
            int filas = historial(SANTIAGO);
            mvc.perform(post("/api/v1/casos/" + SANTIAGO + "/inspeccion/solicitud").header("Authorization", comprador()))
                    .andExpect(status().isCreated());
            asignar(SANTIAGO, gestor(), "especialista-02").andExpect(status().isOk())
                    .andExpect(jsonPath("$.especialistaAsignadoCodigo").value("especialista-02"));

            emitir(SANTIAGO, especialista(1), informe("EMITIDO")).andExpect(status().isForbidden());
            assertThat(leerComo(SANTIAGO, revisor()).get("evaluacionTecnica").get("estado").asString())
                    .isEqualTo("SOLICITADA");

            ObjectNode enCurso = informe("EN_INSPECCION");
            enCurso.put("profesional", "Otro nombre");
            enCurso.put("colegiatura", "CAP 123");
            emitir(SANTIAGO, especialista(2), enCurso).andExpect(status().isOk());
            asignar(SANTIAGO, gestor(), "especialista-02") // en curso también se puede asignar
                    .andExpect(status().isOk());
            emitir(SANTIAGO, especialista(2), informe("EMITIDO")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacionTecnica.estado").value("EMITIDO"))
                    .andExpect(jsonPath("$.evaluacionTecnica.profesional").value("Arq. Perfil Ficticio 02"))
                    .andExpect(jsonPath("$.evaluacionTecnica.profesionalEspecialidad").value("Arquitecto"))
                    .andExpect(jsonPath("$.evaluacionTecnica.colegiatura", startsWith("SIM-")));
            asignar(SANTIAGO, gestor(), "especialista-01") // emitida ya no se reasigna
                    .andExpect(status().isConflict());

            assertThat(leerComo(SANTIAGO, revisor()).get("evaluacion")).as("I8").isEqualTo(antes);
            assertThat(historial(SANTIAGO)).isEqualTo(filas);
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
    }

    @Test
    @DisplayName("Asignación: especialista inválido 400; sin solicitud o ya emitida 409")
    void asignacionInvalida() throws Exception {
        asignar(MOLINOS, gestor(), "revisor-01").andExpect(status().isBadRequest());
        asignar(MOLINOS, gestor(), "no-existe").andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/casos/" + MOLINOS + "/inspeccion/asignacion").header("Authorization", gestor())
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        asignar(SUBTANJALLA, gestor(), "especialista-02").andExpect(status().isConflict());
        asignar(PARCONA, gestor(), "especialista-02").andExpect(status().isConflict());
        asignar("SIM-00000000", gestor(), "especialista-02").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Sin asignación se conserva el comportamiento anterior: cualquier especialista autorizado emite")
    void sinAsignacionCualquieraEmite() throws Exception {
        try {
            mvc.perform(post("/api/v1/casos/" + SANTIAGO + "/inspeccion/solicitud").header("Authorization", comprador()))
                    .andExpect(status().isCreated());
            emitir(SANTIAGO, especialista(2), informe("EMITIDO")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacionTecnica.especialistaAsignadoCodigo").value(nullValue()))
                    .andExpect(jsonPath("$.evaluacionTecnica.profesional").value("Arq. Perfil Ficticio 02"));
        } finally {
            limpiarInspeccion(SANTIAGO);
        }
    }

    // ------------------------------------------------------------------ panel

    @Test
    @DisplayName("Panel: los totales coinciden con el contenido cargado y con el catálogo; es de solo lectura")
    void panelCoherente() throws Exception {
        long id = id(contactar(ICA, comprador(), "{\"motivo\":\"CONSULTA_INSPECCION\"}").andExpect(status().isCreated()));
        try {
            int contactos = jdbc.queryForObject("select count(*) from solicitud_contacto", Integer.class);
            int historialTotal = jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class);
            String r = mvc.perform(get("/api/v1/cartera/panel").header("Authorization", gestor()))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            JsonNode p = json.readTree(r);

            assertThat(p.get("totalCasos").asInt()).isEqualTo(10);
            assertThat(p.get("porColor").get("VERDE").asInt()).isEqualTo(2);
            assertThat(p.get("porColor").get("AMARILLO").asInt()).isEqualTo(4);
            assertThat(p.get("porColor").get("ROJO").asInt()).isEqualTo(2);
            assertThat(p.get("porColor").get("GRIS").asInt()).isEqualTo(2);
            assertThat(p.get("porEstadoPublicacion").get("PUBLICADO").asInt()).isEqualTo(10);
            assertThat(p.get("porEstadoPublicacion").get("BORRADOR").asInt()).isZero();

            // Coherencia con el catálogo del gestor: mismos colores y mismos casos con faltantes.
            JsonNode lista = json.readTree(mvc.perform(get("/api/v1/casos").header("Authorization", gestor()))
                    .andReturn().getResponse().getContentAsString());
            Map<String, Integer> colores = new HashMap<>();
            lista.forEach(c -> colores.merge(c.get("estado").asString(), 1, Integer::sum));
            colores.forEach((color, n) -> assertThat(p.get("porColor").get(color).asInt()).isEqualTo(n));
            int conFaltantes = 0;
            for (JsonNode c : lista) {
                if (!leerComo(c.get("codigo").asString(), gestor()).get("evaluacion").get("faltantes").isEmpty()) {
                    conFaltantes++;
                }
            }
            assertThat(p.get("casosConFaltantes")).hasSize(conFaltantes);
            assertThat(p.get("casosConFaltantes").toString()).contains(SUBTANJALLA, LOS_AQUIJES);

            // Inspecciones de la carga: San José de los Molinos solicitada y Pachacútec en curso, sin asignar.
            assertThat(p.get("inspecciones").toString()).contains(MOLINOS, PACHACUTEC);
            assertThat(p.get("inspecciones")).hasSize(2);
            assertThat(p.get("inspeccionesAsignadas").asInt()).isZero();
            assertThat(p.get("inspeccionesSinAsignar").asInt()).isEqualTo(2);

            assertThat(p.get("contactosPendientes")).hasSize(jdbc.queryForObject(
                    "select count(*) from solicitud_contacto where estado = 'PENDIENTE'", Integer.class));
            assertThat(p.get("contactosPendientes").toString()).contains(ICA);

            assertThat(jdbc.queryForObject("select count(*) from solicitud_contacto", Integer.class)).isEqualTo(contactos);
            assertThat(jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class))
                    .as("consultar el panel no escribe nada").isEqualTo(historialTotal);
            assertThat(r).doesNotContainIgnoringCase("ranking");
        } finally {
            atender(id, gestor()).andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/contactos?estado=ATENDIDA").header("Authorization", gestor()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem((int) id)));
    }
}
