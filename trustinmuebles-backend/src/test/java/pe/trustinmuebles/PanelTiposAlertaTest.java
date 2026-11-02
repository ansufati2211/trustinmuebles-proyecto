package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/** v0.8 (feedback a, D52): cartera por tipo de alerta y por esfuerzo, y filtro por tipo de alerta en GET /casos. */
class PanelTiposAlertaTest extends BaseApiTest {
    static final String[] SEMILLA = {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES, PUEBLO_NUEVO, SANTIAGO, SALAS, MOLINOS,
            PACHACUTEC, ICA};

    JsonNode panel() throws Exception {
        return json.readTree(mvc.perform(get("/api/v1/cartera/panel").header("Authorization", gestor()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    JsonNode ruta(String codigo) throws Exception {
        return json.readTree(mvc.perform(get("/api/v1/casos/" + codigo + "/ruta-regularizacion")
                .header("Authorization", gestor())).andReturn().getResponse().getContentAsString());
    }

    List<String> codigos(String url, String authorization) throws Exception {
        JsonNode lista = json.readTree(mvc.perform(get(url).header("Authorization", authorization))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        List<String> c = new ArrayList<>();
        lista.forEach(x -> c.add(x.get("codigo").asString()));
        return c;
    }

    @Test
    @DisplayName("CP23: los conteos por tipo de alerta y por esfuerzo coinciden con los 10 casos semilla")
    void conteosDeLaSemilla() throws Exception {
        Map<String, Long> tipos = new HashMap<>();
        Map<String, Long> esfuerzos = new HashMap<>();
        for (String codigo : SEMILLA) {
            JsonNode r = ruta(codigo);
            r.get("tiposAlerta").forEach(t -> tipos.merge(t.asString(), 1L, Long::sum));
            esfuerzos.merge(r.get("esfuerzo").isNull() ? "SIN_PASOS" : r.get("esfuerzo").asString(), 1L, Long::sum);
        }
        JsonNode p = panel();
        assertThat(p.get("totalCasos").asInt()).isEqualTo(10);
        for (JsonNode t : p.get("porTipoAlerta")) {
            assertThat(t.get("casos").asLong()).as(t.get("codigo").asString())
                    .isEqualTo(tipos.getOrDefault(t.get("codigo").asString(), 0L));
            assertThat(t.get("nombre").asString()).isNotBlank();
        }
        assertThat(p.get("porTipoAlerta").toString()).contains("INFORMACION_INSUFICIENTE", "RP-01", "RV-02");
        long suma = 0;
        for (String e : new String[] {"BAJO", "MEDIO", "ALTO", "SIN_PASOS"}) {
            assertThat(p.get("porEsfuerzo").get(e).asLong()).as(e).isEqualTo(esfuerzos.getOrDefault(e, 0L));
            suma += p.get("porEsfuerzo").get(e).asLong();
        }
        assertThat(suma).isEqualTo(10);
        // Casos conocidos: Parcona sin pasos, La Tinguiña MEDIO, Pueblo Nuevo ALTO.
        assertThat(p.get("porEsfuerzo").get("SIN_PASOS").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(p.get("avisoPriorizacion").asString())
                .isEqualTo("Priorización interna de la inmobiliaria; no es una recomendación de compra");
    }

    @Test
    @DisplayName("CP23: «por regularizar» lista solo casos con pasos, ordenados por esfuerzo y luego por código")
    void porRegularizarOrdenada() throws Exception {
        JsonNode lista = panel().get("porRegularizar");
        List<String> orden = List.of("BAJO", "MEDIO", "ALTO");
        String anterior = null;
        int esfuerzoAnterior = -1;
        List<String> codigos = new ArrayList<>();
        for (JsonNode c : lista) {
            int e = orden.indexOf(c.get("esfuerzo").asString());
            assertThat(e).isGreaterThanOrEqualTo(esfuerzoAnterior);
            if (e == esfuerzoAnterior) assertThat(c.get("codigo").asString()).isGreaterThan(anterior);
            esfuerzoAnterior = e;
            anterior = c.get("codigo").asString();
            codigos.add(anterior);
            assertThat(c.get("denominacion").asString()).isNotBlank();
            assertThat(c.get("color").asString()).isNotBlank();
        }
        assertThat(codigos).contains(TINGUINA, PUEBLO_NUEVO).doesNotContain(PARCONA);
    }

    @Test
    @DisplayName("CP23: el filtro tipoAlerta devuelve los casos correctos, se combina con el color y valida el valor")
    void filtroPorTipoDeAlerta() throws Exception {
        String revisor = revisor();
        List<String> esperados = new ArrayList<>();
        for (String codigo : SEMILLA) if (ruta(codigo).get("tiposAlerta").toString().contains("\"RV-02\"")) esperados.add(codigo);
        assertThat(esperados).contains(TINGUINA);
        assertThat(codigos("/api/v1/casos?tipoAlerta=RV-02", revisor)).containsExactlyInAnyOrderElementsOf(esperados);
        assertThat(codigos("/api/v1/casos?tipoAlerta=rp-01", revisor)).contains(PUEBLO_NUEVO).doesNotContain(PARCONA);
        assertThat(codigos("/api/v1/casos?tipoAlerta=RV-02&estado=VERDE", revisor)).isEmpty();
        for (String c : codigos("/api/v1/casos?tipoAlerta=INFORMACION_INSUFICIENTE", revisor)) {
            assertThat(leerComo(c, revisor).get("evaluacion").get("estado").asString()).isEqualTo("GRIS");
        }
        mvc.perform(get("/api/v1/casos?tipoAlerta=XX-99").header("Authorization", revisor))
                .andExpect(status().isBadRequest());
        // El comprador también filtra, pero solo ve publicados.
        mvc.perform(delete("/api/v1/casos/" + TINGUINA + "/publicacion").header("Authorization", gestor()))
                .andExpect(status().isOk());
        try {
            assertThat(codigos("/api/v1/casos?tipoAlerta=RV-02", comprador())).doesNotContain(TINGUINA);
        } finally {
            mvc.perform(post("/api/v1/casos/" + TINGUINA + "/publicacion").header("Authorization", gestor()))
                    .andExpect(status().isOk());
        }
        assertThat(codigos("/api/v1/casos?tipoAlerta=RV-02", comprador())).contains(TINGUINA);
        mvc.perform(get("/api/v1/casos/tipos-alerta").header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigo").exists());
    }

    @Test
    @DisplayName("El panel da 403 a comprador, revisor, especialista y propietario")
    void soloGestor() throws Exception {
        for (String cuenta : new String[] {"comprador-01", "revisor-01", "especialista-01", "propietario-01"}) {
            mvc.perform(get("/api/v1/cartera/panel").header("Authorization", token(cuenta)))
                    .andExpect(status().isForbidden());
        }
    }
}
