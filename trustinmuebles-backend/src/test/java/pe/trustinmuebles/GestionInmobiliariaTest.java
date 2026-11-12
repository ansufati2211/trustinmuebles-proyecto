package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;

/** v0.8 (decisión 2, I15, D54): semáforo de gestión interno y decisión de captación. */
class GestionInmobiliariaTest extends BaseApiTest {
    static final String[] SEMILLA = {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES, PUEBLO_NUEVO, SANTIAGO, SALAS, MOLINOS,
            PACHACUTEC, ICA, HUARMEY, SUPE};

    ResultActions decidir(String codigo, String authorization, String cuerpo) throws Exception {
        return mvc.perform(post("/api/v1/casos/" + codigo + "/decision-captacion").header("Authorization", authorization)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }

    JsonNode lista(String authorization) throws Exception {
        return json.readTree(mvc.perform(get("/api/v1/casos").header("Authorization", authorization))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    int filasHistorialA(String codigo) {
        return jdbc.queryForObject("select count(*) from historial_evaluacion where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)",
                Integer.class, codigo);
    }

    @Test
    @DisplayName("CP24, I15: comprador, propietario y especialista no reciben el campo gestion; gestor y revisor sí")
    void soloGestorYRevisorVenElCampo() throws Exception {
        for (String cuenta : new String[] {"comprador-01", "propietario-01", "especialista-01"}) {
            String t = token(cuenta);
            for (JsonNode c : lista(t)) assertThat(c.has("gestion")).as(cuenta + " " + c.get("codigo")).isFalse();
            String codigo = cuenta.equals("propietario-01") ? lista(t).get(0).get("codigo").asString() : PARCONA;
            assertThat(leerComo(codigo, t).has("gestion")).as(cuenta).isFalse();
            String crudo = mvc.perform(get("/api/v1/casos/" + codigo).header("Authorization", t))
                    .andReturn().getResponse().getContentAsString();
            assertThat(crudo).doesNotContain("\"gestion\"", "Uso interno de la inmobiliaria");
        }
        for (String cuenta : new String[] {"gestor-01", "revisor-01"}) {
            String t = token(cuenta);
            for (JsonNode c : lista(t)) assertThat(c.get("gestion").get("estado").asString()).isNotBlank();
            JsonNode g = leerComo(PUEBLO_NUEVO, t).get("gestion");
            assertThat(g.get("estado").asString()).isEqualTo("REQUIERE_REGULARIZACION");
            assertThat(g.get("aviso").asString())
                    .isEqualTo("Uso interno de la inmobiliaria; no se muestra al comprador ni es una recomendación de compra");
        }
        JsonNode g = leerComo(PARCONA, gestor()).get("gestion");
        assertThat(g.get("estado").asString()).isEqualTo("VIABLE");
        assertThat(leerComo(TINGUINA, gestor()).get("gestion").get("estado").asString()).isEqualTo("VIABLE_CON_CONDICIONES");
        assertThat(leerComo(LOS_AQUIJES, gestor()).get("gestion").get("estado").asString()).isEqualTo("COMPLETAR_INFORMACION");
    }

    @Test
    @DisplayName("CP24, I15: solo el gestor registra decisiones; comprador, propietario y especialista reciben 403 en ambos endpoints")
    void permisosDeDecision() throws Exception {
        String cuerpo = "{\"decision\":\"CAPTAR\",\"motivo\":\"DOCUMENTACION_COMPLETA\"}";
        for (String cuenta : new String[] {"comprador-01", "propietario-01", "especialista-01", "revisor-01"}) {
            decidir(PARCONA, token(cuenta), cuerpo).andExpect(status().isForbidden());
        }
        for (String cuenta : new String[] {"comprador-01", "propietario-01", "especialista-01"}) {
            mvc.perform(get("/api/v1/casos/" + PARCONA + "/decisiones-captacion").header("Authorization", token(cuenta)))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/decisiones-captacion").header("Authorization", revisor()))
                .andExpect(status().isOk());
        decidir("SIM-00000000", gestor(), cuerpo).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("CP24: sin texto libre: solo decision y motivo de las listas cerradas (400 si no)")
    void soloListasCerradas() throws Exception {
        String g = gestor();
        decidir(ICA, g, "{\"decision\":\"CAPTAR\",\"motivo\":\"OTRO_MOTIVO_COMERCIAL\",\"comentario\":\"el dueño es amigo\"}")
                .andExpect(status().isBadRequest());
        decidir(ICA, g, "{\"decision\":\"QUIZAS\",\"motivo\":\"OTRO_MOTIVO_COMERCIAL\"}").andExpect(status().isBadRequest());
        decidir(ICA, g, "{\"decision\":\"CAPTAR\"}").andExpect(status().isBadRequest());
        decidir(ICA, g, "{\"decision\":\"CAPTAR\",\"motivo\":\"Me gusta\"}").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("CP24, I15: registrar una decisión no cambia A, B ni el historial de A, y el historial de decisiones es de solo adición")
    void decisionNoCambiaAniB() throws Exception {
        String g = gestor();
        JsonNode antes = leerComo(PUEBLO_NUEVO, g);
        int filas = filasHistorialA(PUEBLO_NUEVO);
        decidir(PUEBLO_NUEVO, g, "{\"decision\":\"CAPTAR_CON_CONDICIONES\",\"motivo\":\"REGULARIZACION_EN_CURSO\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.cuentaCodigo").value("gestor-01"))
                .andExpect(jsonPath("$.registradaEn").isNotEmpty());
        decidir(PUEBLO_NUEVO, g, "{\"decision\":\"NO_CAPTAR_POR_AHORA\",\"motivo\":\"PROCESO_JUDICIAL\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.decisionEtiqueta").value("No captar por ahora"));
        JsonNode despues = leerComo(PUEBLO_NUEVO, g);
        assertThat(despues.get("evaluacion")).isEqualTo(antes.get("evaluacion"));
        assertThat(despues.get("evaluacionTecnica")).isEqualTo(antes.get("evaluacionTecnica"));
        assertThat(despues.get("gestion")).isEqualTo(antes.get("gestion"));
        assertThat(filasHistorialA(PUEBLO_NUEVO)).isEqualTo(filas);

        JsonNode historial = json.readTree(mvc.perform(get("/api/v1/casos/" + PUEBLO_NUEVO + "/decisiones-captacion")
                .header("Authorization", g)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(historial.size()).isGreaterThanOrEqualTo(2);
        JsonNode ultimo = historial.get(historial.size() - 1);
        assertThat(ultimo.get("decision").asString()).isEqualTo("NO_CAPTAR_POR_AHORA");
        assertThat(historial.get(historial.size() - 2).get("decision").asString()).isEqualTo("CAPTAR_CON_CONDICIONES");
        // No hay rutas para editar ni borrar el historial de decisiones.
        long id = ultimo.get("id").asLong();
        for (String cuenta : new String[] {"gestor-01", "revisor-01"}) {
            mvc.perform(put("/api/v1/casos/" + PUEBLO_NUEVO + "/decisiones-captacion/" + id).header("Authorization", token(cuenta))
                    .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"CAPTAR\"}"))
                    .andExpect(status().is4xxClientError());
            mvc.perform(delete("/api/v1/casos/" + PUEBLO_NUEVO + "/decisiones-captacion").header("Authorization", token(cuenta)))
                    .andExpect(status().is4xxClientError());
        }
        assertThat(jdbc.queryForObject("select count(*) from decision_captacion where caso_codigo = ?", Integer.class,
                PUEBLO_NUEVO)).isEqualTo(historial.size());
    }

    @Test
    @DisplayName("CP24: publicar funciona con cualquier decisión si hay autorización, también con NO_CAPTAR_POR_AHORA")
    void decisionNoBloqueaPublicar() throws Exception {
        String g = gestor();
        decidir(ICA, g, "{\"decision\":\"NO_CAPTAR_POR_AHORA\",\"motivo\":\"OTRO_MOTIVO_COMERCIAL\"}")
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/casos/" + ICA + "/publicacion").header("Authorization", g)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/casos/" + ICA + "/publicacion").header("Authorization", g)).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PUBLICADO"));
        decidir(ICA, g, "{\"decision\":\"CAPTAR\",\"motivo\":\"DOCUMENTACION_COMPLETA\"}").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("CP24: los conteos por estado de gestión y la matriz tipo de alerta × estado coinciden con los casos semilla")
    void conteosDelPanel() throws Exception {
        Map<String, Long> porEstado = new HashMap<>();
        Map<String, Long> celdas = new HashMap<>();
        for (String codigo : conMatrices(SEMILLA)) { // v1.0 (etapa 3a): el panel también cuenta las partidas matrices
            JsonNode d = leerComo(codigo, gestor());
            String estado = d.get("gestion").get("estado").asString();
            porEstado.merge(estado, 1L, Long::sum);
            JsonNode r = json.readTree(mvc.perform(get("/api/v1/casos/" + codigo + "/ruta-regularizacion")
                    .header("Authorization", gestor())).andReturn().getResponse().getContentAsString());
            r.get("tiposAlerta").forEach(t -> celdas.merge(t.asString() + "|" + estado, 1L, Long::sum));
        }
        JsonNode p = json.readTree(mvc.perform(get("/api/v1/cartera/panel").header("Authorization", gestor()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        long suma = 0;
        for (String e : new String[] {"VIABLE", "VIABLE_CON_CONDICIONES", "REQUIERE_REGULARIZACION", "COMPLETAR_INFORMACION"}) {
            assertThat(p.get("porEstadoGestion").get(e).asLong()).as(e).isEqualTo(porEstado.getOrDefault(e, 0L));
            suma += p.get("porEstadoGestion").get(e).asLong();
        }
        assertThat(suma).isEqualTo(CASOS_CARGA);
        for (JsonNode fila : p.get("matrizGestion")) {
            String tipo = fila.get("codigo").asString();
            fila.get("porEstadoGestion").properties().forEach(c -> assertThat(c.getValue().asLong())
                    .as(tipo + "|" + c.getKey()).isEqualTo(celdas.getOrDefault(tipo + "|" + c.getKey(), 0L)));
        }
        for (JsonNode c : p.get("porRegularizar")) assertThat(c.get("estadoGestion").asString()).isNotBlank();
    }
}
