package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** v0.8 (B3, feedback b): acreedor y plazo del gravamen. Son opcionales, del rubro D y no intervienen en el color. */
class GravamenTest extends BaseApiTest {

    JsonNode itemHipoteca(String codigo) throws Exception {
        JsonNode r = json.readTree(mvc.perform(get("/api/v1/casos/" + codigo + "/ruta-regularizacion")
                .header("Authorization", gestor())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode i : r.get("items")) if (i.get("clave").asString().equals("RV-02")) return i;
        throw new AssertionError("Sin hipoteca en la ruta de " + codigo);
    }

    static ObjectNode asiento(ObjectNode peticion, String referencia) {
        for (JsonNode a : peticion.get("asientos")) {
            if (a.get("referencia").asString().equals(referencia)) return (ObjectNode) a;
        }
        throw new AssertionError("Sin asiento " + referencia);
    }

    @Test
    @DisplayName("CP24: sin datos, la ruta de la hipoteca dice «No consta» y pide solicitarlos al propietario o al acreedor")
    void vacioNoConsta() throws Exception {
        JsonNode g = itemHipoteca(TINGUINA).get("gravamen");
        assertThat(g.get("acreedor").asString()).isEqualTo("No consta");
        assertThat(g.get("plazoOVencimiento").isNull()).isTrue();
        assertThat(g.get("plazo").asString()).isEqualTo("No consta en la partida: solicitar al propietario o al acreedor");
    }

    @Test
    @DisplayName("CP24: guardar y leer acreedor y plazo; editarlos no cambia el color ni las reglas aplicadas")
    void guardarYLeerSinCambiarElColor() throws Exception {
        JsonNode original = leer(TINGUINA);
        try {
            ObjectNode p = peticion(original);
            asiento(p, "D00001").put("acreedor", "Banco Demo del Sur S.A.").put("plazoOVencimiento", "Vence el 15/03/2031");
            actualizarExpediente(TINGUINA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.expediente.asientos[?(@.referencia=='D00001')].acreedor")
                            .value("Banco Demo del Sur S.A."))
                    .andExpect(jsonPath("$.expediente.asientos[?(@.referencia=='D00001')].plazoOVencimiento")
                            .value("Vence el 15/03/2031"));
            JsonNode despues = leer(TINGUINA).get("evaluacion");
            assertThat(despues.get("estado")).isEqualTo(original.get("evaluacion").get("estado"));
            assertThat(despues.get("reglasAplicadas")).isEqualTo(original.get("evaluacion").get("reglasAplicadas"));
            assertThat(despues.get("motivos")).isEqualTo(original.get("evaluacion").get("motivos"));
            JsonNode g = itemHipoteca(TINGUINA).get("gravamen");
            assertThat(g.get("acreedor").asString()).isEqualTo("Banco Demo del Sur S.A.");
            assertThat(g.get("plazo").asString()).isEqualTo("Plazo o vencimiento: Vence el 15/03/2031");
        } finally {
            restaurar(TINGUINA, original);
        }
        assertThat(itemHipoteca(TINGUINA).get("gravamen").get("acreedor").asString()).isEqualTo("No consta");
    }

    @Test
    @DisplayName("El acreedor solo puede ser una persona jurídica o «no consta», y solo en el rubro D (400 si no)")
    void soloPersonasJuridicasEnElRubroD() throws Exception {
        JsonNode original = leer(TINGUINA);
        ObjectNode natural = peticion(original);
        asiento(natural, "D00001").put("acreedor", "Juan Pérez Quispe");
        actualizarExpediente(TINGUINA, revisor(), natural).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("persona jurídica")));
        ObjectNode enC = peticion(original);
        ((ObjectNode) enC.get("asientos").get(0)).put("plazoOVencimiento", "2030");
        actualizarExpediente(TINGUINA, revisor(), enC).andExpect(status().isBadRequest());
        assertThat(leer(TINGUINA)).isEqualTo(original);

        try {
            ObjectNode noConsta = peticion(original);
            asiento(noConsta, "D00001").put("acreedor", "no consta");
            actualizarExpediente(TINGUINA, revisor(), noConsta).andExpect(status().isOk());
        } finally {
            restaurar(TINGUINA, original);
        }
    }
}
