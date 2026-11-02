package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** v0.8 (feedback b, decisión 3): ruta de regularización por caso, de solo lectura y orientativa. */
class RutaRegularizacionTest extends BaseApiTest {
    static final String[] SEMILLA = {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES, PUEBLO_NUEVO, SANTIAGO, SALAS, MOLINOS,
            PACHACUTEC, ICA};

    JsonNode ruta(String codigo, String authorization) throws Exception {
        return json.readTree(mvc.perform(get("/api/v1/casos/" + codigo + "/ruta-regularizacion")
                        .header("Authorization", authorization))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    static List<String> claves(JsonNode ruta) {
        List<String> c = new ArrayList<>();
        ruta.get("items").forEach(i -> c.add(i.get("clave").asString()));
        return c;
    }

    int filasHistorial() {
        return jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class);
    }

    @Test
    @DisplayName("CP23: Parcona (verde) no tiene pasos y lo dice; el aviso orientativo siempre acompaña la ruta")
    void parconaSinPasos() throws Exception {
        JsonNode r = ruta(PARCONA, comprador());
        assertThat(r.get("items")).isEmpty();
        assertThat(r.get("esfuerzo").isNull()).isTrue();
        assertThat(r.get("mensaje").asString())
                .isEqualTo("Sin alertas en los campos evaluados: no hay pasos de regularización");
        assertThat(r.get("aviso").asString()).isEqualTo("Orientativo: no es asesoría legal ni recomendación de compra");
        assertThat(r.get("estadoRevision").asString()).contains("pendiente de revisión especializada");
        assertThat(r.get("plazoGeneral").asString()).contains("consultar con abogado o notario");
    }

    @Test
    @DisplayName("CP23: La Tinguiña da hipoteca (acreedor, MEDIO) y planos (propietario, BAJO): esfuerzo MEDIO")
    void tinguinaMedio() throws Exception {
        JsonNode r = ruta(TINGUINA, comprador());
        assertThat(claves(r)).containsExactlyInAnyOrder("RV-02", "RV-04", "RV-04");
        assertThat(r.get("esfuerzo").asString()).isEqualTo("MEDIO");
        for (JsonNode i : r.get("items")) {
            if (i.get("clave").asString().equals("RV-02")) {
                assertThat(i.get("gestiona").asString()).isEqualTo("acreedor");
                assertThat(i.get("esfuerzo").asString()).isEqualTo("MEDIO");
                assertThat(i.get("referencia").asString()).isEqualTo("D00001");
            } else {
                assertThat(i.get("gestiona").asString()).isEqualTo("propietario");
                assertThat(i.get("esfuerzo").asString()).isEqualTo("BAJO");
            }
            assertThat(i.get("pasos")).isNotEmpty();
            assertThat(i.get("documentoRequerido").asString()).isNotBlank();
        }
        assertThat(r.get("tiposAlerta").toString()).contains("RV-02", "RV-04");
    }

    @Test
    @DisplayName("CP23: Pueblo Nuevo, con embargo vigente, requiere un proceso judicial: esfuerzo ALTO")
    void puebloNuevoAlto() throws Exception {
        JsonNode r = ruta(PUEBLO_NUEVO, comprador());
        assertThat(claves(r)).contains("RP-01");
        assertThat(r.get("esfuerzo").asString()).isEqualTo("ALTO");
        assertThat(r.get("estado").asString()).isEqualTo("ROJO");
    }

    @Test
    @DisplayName("Cada alerta y cada faltante de los 10 casos semilla tiene su paso, y el esfuerzo es el máximo de los ítems")
    void cadaMotivoTieneSuPaso() throws Exception {
        String revisor = revisor();
        for (String codigo : SEMILLA) {
            JsonNode d = leerComo(codigo, revisor).get("evaluacion");
            JsonNode r = ruta(codigo, revisor);
            int condicion = d.get("motivos").toString().contains("\"CONDICION\"") ? 1 : 0;
            assertThat(r.get("items")).as(codigo)
                    .hasSize(d.get("alertas").size() + d.get("faltantes").size() + condicion);
            String max = null;
            for (JsonNode i : r.get("items")) {
                String e = i.get("esfuerzo").asString();
                if (max == null || List.of("BAJO", "MEDIO", "ALTO").indexOf(e) > List.of("BAJO", "MEDIO", "ALTO").indexOf(max)) max = e;
            }
            assertThat(r.get("esfuerzo").isNull() ? null : r.get("esfuerzo").asString()).as(codigo).isEqualTo(max);
            if (d.get("estado").asString().equals("GRIS")) {
                assertThat(r.get("tiposAlerta").toString()).as(codigo).contains("INFORMACION_INSUFICIENTE");
            }
        }
    }

    @Test
    @DisplayName("I8: pedir la ruta no cambia el color ni agrega filas al historial")
    void soloLectura() throws Exception {
        int antes = filasHistorial();
        JsonNode evaluaciones = json.createArrayNode();
        for (String codigo : SEMILLA) ((tools.jackson.databind.node.ArrayNode) evaluaciones).add(leer(codigo).get("evaluacion"));
        for (String codigo : SEMILLA) {
            ruta(codigo, gestor());
            ruta(codigo, revisor());
        }
        assertThat(filasHistorial()).isEqualTo(antes);
        for (int i = 0; i < SEMILLA.length; i++) {
            assertThat(leer(SEMILLA[i]).get("evaluacion")).isEqualTo(evaluaciones.get(i));
        }
    }

    @Test
    @DisplayName("Visibilidad: el comprador recibe 404 en un borrador y el propietario de otro caso también")
    void visibilidad() throws Exception {
        String numero = "SIM-99000707";
        ObjectNode p = json.createObjectNode();
        p.put("origen", "SIMULADA_DEMOSTRACION");
        p.put("numero", numero);
        p.put("denominacion", "Mz. R Lote 7 · Hab. Urb. Demostración · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-11-01");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        p.putArray("asientos").addObject().put("referencia", "C00001").put("tipoActo", "COMPRAVENTA")
                .put("titulares", "Inmobiliaria Demo Sur S.A.C. (100 %)");
        p.put("tipoPredio", "LOTE");
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-01");
        try {
            mvc.perform(post("/api/v1/casos").header("Authorization", revisor()).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(p))).andExpect(status().isCreated());
            mvc.perform(get("/api/v1/casos/" + numero + "/ruta-regularizacion").header("Authorization", comprador()))
                    .andExpect(status().isNotFound());
            mvc.perform(get("/api/v1/casos/" + numero + "/ruta-regularizacion").header("Authorization", propietario(2)))
                    .andExpect(status().isNotFound());
            ruta(numero, propietario(1));
            ruta(numero, token("especialista-01"));
        } finally {
            mvc.perform(delete("/api/v1/casos/" + numero).header("Authorization", revisor()));
        }
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/ruta-regularizacion")).andExpect(status().isUnauthorized());
    }
}
