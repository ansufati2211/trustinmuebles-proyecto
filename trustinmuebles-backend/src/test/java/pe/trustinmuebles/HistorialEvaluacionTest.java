package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.lang.reflect.Method;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v0.7 (F2): subsanación e historial de evaluaciones. Invariantes I8 (el color solo cambia por un recálculo del motor),
 * I9 (un PDF o plano no levanta un rojo registral) e I12 (historial de solo adición).
 */
class HistorialEvaluacionTest extends BaseApiTest {
    static final String VIVIENDA = "77777777";
    static final String EMBARGADA = "66666666";

    @Autowired ApplicationContext contexto;

    ResultActions historial(String codigo, String auth) throws Exception {
        return mvc.perform(get("/api/v1/casos/" + codigo + "/historial").header("Authorization", auth));
    }

    JsonNode filas(String codigo) throws Exception {
        return json.readTree(historial(codigo, revisor()).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString());
    }

    int contar(String codigo) {
        return jdbc.queryForObject("select count(*) from historial_evaluacion where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)",
                Integer.class, codigo);
    }

    /** Vivienda transcrita con arquitectura y estructuras, sin II.EE. ni II.SS.: las reglas la dejan en AMARILLO (RV-04). */
    ObjectNode vivienda(String numero) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "TRANSCRITA_CONOCE_AQUI");
        p.put("numero", numero);
        p.put("denominacion", "Mz. J Lote 4 · Hab. Urb. Los Sauces · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-10-17");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Inmobiliaria Los Sauces S.A.C. adquirió el predio por compraventa.");
        c.put("titulares", "Inmobiliaria Los Sauces S.A.C. (100 %)");
        p.put("tipoPredio", "VIVIENDA");
        p.put("areaConstruidaInscrita", 90.00);
        ArrayNode planos = p.putArray("planos");
        planos.addObject().put("especialidad", "ARQUITECTURA").put("estado", "PRESENTADO").put("areaConstruida", 90.00);
        planos.addObject().put("especialidad", "ESTRUCTURAS").put("estado", "PRESENTADO");
        planos.addObject().put("especialidad", "ELECTRICAS").put("estado", "NO_PRESENTADO");
        planos.addObject().put("especialidad", "SANITARIAS").put("estado", "NO_PRESENTADO");
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-01");
        return p;
    }

    ResultActions registrar(ObjectNode cuerpo) throws Exception {
        return mvc.perform(post("/api/v1/casos").header("Authorization", revisor())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)));
    }

    void borrar(String codigo) throws Exception {
        mvc.perform(delete("/api/v1/casos/" + codigo).header("Authorization", revisor()));
    }

    static void presentar(ObjectNode peticion, String especialidad) {
        for (var plano : (ArrayNode) peticion.get("planos")) {
            if (plano.get("especialidad").asString().equals(especialidad)) ((ObjectNode) plano).put("estado", "PRESENTADO");
        }
    }

    // ------------------------------------------------------------------ carga inicial

    @Test
    @DisplayName("Cada caso tiene una sola evaluación inicial, y volver a cargar el contenido no la duplica")
    void inicialUnaVezPorCaso() throws Exception {
        assertThat(jdbc.queryForList("select count(*) from historial_evaluacion h join expediente e on e.id = h.expediente_id "
                + "join caso_lote c on c.id = e.caso_id where c.sintetico = true and h.origen = 'CARGA_INICIAL' "
                + "group by h.expediente_id", Integer.class)).hasSize(10).containsOnly(1);
        JsonNode primera = filas(PARCONA).get(0);
        assertThat(primera.get("origen").asString()).isEqualTo("CARGA_INICIAL");
        assertThat(primera.get("estadoAnterior").isNull()).isTrue();
        assertThat(primera.get("estadoNuevo").asString()).isEqualTo("VERDE");
        assertThat(primera.get("cuentaCodigo").asString()).isEqualTo("sistema");
        assertThat(primera.get("versionReglas").asString()).isEqualTo("v0.4");

        int antes = jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class);
        contexto.getBean("casosSeeder", ApplicationRunner.class).run(new DefaultApplicationArguments());
        assertThat(jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class))
                .as("una segunda carga no agrega filas").isEqualTo(antes);
    }

    @Test
    @DisplayName("Una base sin historial (anterior a la v0.7) recibe una fila inicial por caso al arrancar")
    void baseAnteriorRecibeLaInicial() throws Exception {
        // Simula una base v0.6 para un caso: su historial aún no existe.
        jdbc.update("delete from historial_evaluacion where expediente_id = (select e.id from expediente e "
                + "join caso_lote c on c.id = e.caso_id where c.codigo = ?)", SANTIAGO);
        contexto.getBean("casosSeeder", ApplicationRunner.class).run(new DefaultApplicationArguments());
        assertThat(contar(SANTIAGO)).isEqualTo(1);
        assertThat(filas(SANTIAGO).get(0).get("origen").asString()).isEqualTo("CARGA_INICIAL");
        contexto.getBean("casosSeeder", ApplicationRunner.class).run(new DefaultApplicationArguments());
        assertThat(contar(SANTIAGO)).isEqualTo(1);
    }

    // ------------------------------------------------------------------ recálculos

    @Test
    @DisplayName("Cada recálculo agrega una fila con color anterior y nuevo, motivos, faltantes, versión, origen y cuenta")
    void cadaRecalculoAgregaUnaFila() throws Exception {
        JsonNode original = leer(PARCONA);
        int antes = contar(PARCONA);
        actualizarExpediente(PARCONA, revisor(), peticion(original)).andExpect(status().isOk());
        assertThat(contar(PARCONA)).isEqualTo(antes + 1);
        JsonNode ultima = filas(PARCONA).get(antes);
        assertThat(ultima.get("origen").asString()).isEqualTo("EDICION");
        assertThat(ultima.get("cuentaCodigo").asString()).isEqualTo("revisor-01");
        assertThat(ultima.get("estadoAnterior").asString()).isEqualTo("VERDE");
        assertThat(ultima.get("estadoNuevo").asString()).isEqualTo("VERDE");
        assertThat(ultima.get("motivos")).isNotEmpty();
        assertThat(ultima.get("faltantes").isArray()).isTrue();
        assertThat(ultima.get("versionReglas").asString()).isEqualTo("v0.4");
        assertThat(ultima.get("registradaEn").asString()).isNotBlank();
        restaurar(PARCONA, original);
        assertThat(contar(PARCONA)).isEqualTo(antes + 2);
    }

    @Test
    @DisplayName("Subsanación: el plano faltante lleva el amarillo a verde porque lo dicen las reglas, y queda en el historial")
    void planoFaltanteLlevaAVerde() throws Exception {
        try {
            registrar(vivienda(VIVIENDA)).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                    .andExpect(jsonPath("$.evaluacion.reglasAplicadas", contains("RV-04")));
            ObjectNode p = peticion(leerComo(VIVIENDA, revisor()));
            presentar(p, "ELECTRICAS");
            actualizarExpediente(VIVIENDA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                    .andExpect(jsonPath("$.evaluacion.reglasAplicadas", contains("RV-04")));
            p = peticion(leerComo(VIVIENDA, revisor()));
            presentar(p, "SANITARIAS");
            actualizarExpediente(VIVIENDA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                    .andExpect(jsonPath("$.evaluacion.etiqueta").value("Sin alertas en los campos evaluados"));

            JsonNode h = filas(VIVIENDA);
            assertThat(h).hasSize(3);
            assertThat(h.get(0).get("origen").asString()).isEqualTo("PARTIDA_TRANSCRITA");
            assertThat(h.get(0).get("estadoNuevo").asString()).isEqualTo("AMARILLO");
            assertThat(h.get(1).get("origen").asString()).isEqualTo("PLANO_ADJUNTO");
            assertThat(h.get(1).get("estadoNuevo").asString()).isEqualTo("AMARILLO");
            assertThat(h.get(2).get("origen").asString()).isEqualTo("PLANO_ADJUNTO");
            assertThat(h.get(2).get("estadoAnterior").asString()).isEqualTo("AMARILLO");
            assertThat(h.get(2).get("estadoNuevo").asString()).isEqualTo("VERDE");
        } finally {
            borrar(VIVIENDA);
        }
    }

    @Test
    @DisplayName("Subsanación: en La Tinguiña los planos faltantes no la llevan a verde, porque la hipoteca sigue vigente")
    void planosNoBastanSiHayOtraAlerta() throws Exception {
        JsonNode original = leer(TINGUINA);
        try {
            ObjectNode p = peticion(original);
            presentar(p, "ELECTRICAS");
            presentar(p, "SANITARIAS");
            actualizarExpediente(TINGUINA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                    .andExpect(jsonPath("$.evaluacion.reglasAplicadas", contains("RV-02")));
        } finally {
            restaurar(TINGUINA, original);
        }
        assertThat(leer(TINGUINA).get("evaluacion").get("reglasAplicadas").toString()).contains("RV-04");
    }

    @Test
    @DisplayName("I9: adjuntar el PDF del caso o de un plano a un caso rojo por embargo no cambia el color")
    void pdfNoLevantaElEmbargo() throws Exception {
        try {
            ObjectNode p = vivienda(EMBARGADA);
            presentar(p, "ELECTRICAS");
            presentar(p, "SANITARIAS");
            ObjectNode d = ((ArrayNode) p.get("asientos")).addObject();
            d.put("referencia", "D00001");
            d.put("tipoActo", "EMBARGO");
            d.put("estado", "VIGENTE");
            d.put("texto", "Embargo en forma de inscripción por mandato judicial.");
            registrar(p).andExpect(status().isCreated()).andExpect(jsonPath("$.evaluacion.estado").value("ROJO"));

            var pdf = new MockMultipartFile("documento", "x.pdf", "application/pdf", "%PDF-1.4\n%prueba\n".getBytes());
            mvc.perform(multipart("/api/v1/casos/" + EMBARGADA + "/documento").file(pdf).header("Authorization", revisor()))
                    .andExpect(status().isCreated());
            mvc.perform(multipart("/api/v1/casos/" + EMBARGADA + "/planos/ARQUITECTURA/documento").file(pdf)
                    .header("Authorization", revisor())).andExpect(status().isCreated());
            JsonNode ev = leerComo(EMBARGADA, revisor()).get("evaluacion");
            assertThat(ev.get("estado").asString()).isEqualTo("ROJO");
            assertThat(ev.get("reglasAplicadas").toString()).contains("RP-01");

            JsonNode h = filas(EMBARGADA);
            assertThat(h).hasSize(3);
            assertThat(h.get(1).get("origen").asString()).isEqualTo("EDICION");
            assertThat(h.get(2).get("origen").asString()).isEqualTo("PLANO_ADJUNTO");
            for (JsonNode f : h) assertThat(f.get("estadoNuevo").asString()).isEqualTo("ROJO");

            // Solo la partida transcrita nueva (el asiento E que cancela el embargo) puede levantarlo, y el motor recalcula.
            ObjectNode cancelacion = peticion(leerComo(EMBARGADA, revisor()));
            agregarAsiento(cancelacion, "E00001", "CANCELACION", null, "Se cancela el embargo.", "D00001");
            actualizarExpediente(EMBARGADA, revisor(), cancelacion).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"));
            JsonNode ultima = filas(EMBARGADA).get(3);
            assertThat(ultima.get("origen").asString()).isEqualTo("PARTIDA_TRANSCRITA");
            assertThat(ultima.get("estadoAnterior").asString()).isEqualTo("ROJO");
        } finally {
            borrar(EMBARGADA);
        }
    }

    // ------------------------------------------------------------------ operaciones que no recalculan

    @Test
    @DisplayName("I3 e I8: el checklist (HR y PU), autorizar y publicar no agregan filas ni cambian el color")
    void operacionesSinRecalculo() throws Exception {
        JsonNode original = leer(ICA);
        int antes = contar(ICA);
        JsonNode item = original.get("checklist").get(0);
        mvc.perform(patch("/api/v1/casos/" + ICA + "/checklist/" + item.get("id").asLong()).header("Authorization", revisor())
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"OBSERVADO\",\"observacion\":\"x\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/v1/casos/" + ICA + "/checklist/" + item.get("id").asLong()).header("Authorization", revisor())
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"" + item.get("estado").asString() + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/casos/" + ICA + "/autorizacion").header("Authorization", propietario(2)))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/v1/casos/" + ICA + "/publicacion").header("Authorization", gestor()))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/casos/" + ICA + "/publicacion").header("Authorization", gestor()))
                .andExpect(status().isOk());
        assertThat(contar(ICA)).isEqualTo(antes);
        assertThat(leer(ICA).get("evaluacion")).isEqualTo(original.get("evaluacion"));
    }

    // ------------------------------------------------------------------ I12 y permisos

    @Test
    @DisplayName("I12: no hay rutas para editar o borrar el historial y el repositorio no tiene métodos de borrado")
    void historialInmutable() throws Exception {
        int antes = contar(PARCONA);
        String revisor = revisor();
        String gestor = gestor();
        for (String auth : new String[] {revisor, gestor}) {
            mvc.perform(put("/api/v1/casos/" + PARCONA + "/historial").header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON).content("[]"))
                    .andExpect(status().is4xxClientError());
            mvc.perform(patch("/api/v1/casos/" + PARCONA + "/historial").header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().is4xxClientError());
            mvc.perform(delete("/api/v1/casos/" + PARCONA + "/historial").header("Authorization", auth))
                    .andExpect(status().is4xxClientError());
            mvc.perform(post("/api/v1/casos/" + PARCONA + "/historial").header("Authorization", auth)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"estadoNuevo\":\"VERDE\"}"))
                    .andExpect(status().is4xxClientError());
        }
        assertThat(contar(PARCONA)).isEqualTo(antes);

        Class<?> repo = Class.forName("pe.trustinmuebles.clasificacion.HistorialEvaluacionRepository");
        assertThat(org.springframework.data.repository.CrudRepository.class.isAssignableFrom(repo)).isFalse();
        assertThat(Arrays.stream(repo.getMethods()).map(Method::getName))
                .noneMatch(n -> n.startsWith("delete") || n.startsWith("remove") || n.startsWith("update"));
        Class<?> entidad = Class.forName("pe.trustinmuebles.clasificacion.HistorialEvaluacion");
        assertThat(entidad.isAnnotationPresent(org.hibernate.annotations.Immutable.class)).isTrue();
    }

    @Test
    @DisplayName("Acceso al historial: equipo y propietario del caso sí; comprador 403; propietario ajeno 404; sin sesión 401")
    void accesoAlHistorial() throws Exception {
        for (String auth : new String[] {revisor(), gestor(), token("especialista-01"), propietario(1)}) {
            historial(PARCONA, auth).andExpect(status().isOk()).andExpect(jsonPath("$", not(empty())));
        }
        historial(PARCONA, comprador()).andExpect(status().isForbidden());
        historial(PARCONA, propietario(2)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/historial")).andExpect(status().isUnauthorized());
        historial("SIM-00000000", revisor()).andExpect(status().isNotFound());
    }
}
