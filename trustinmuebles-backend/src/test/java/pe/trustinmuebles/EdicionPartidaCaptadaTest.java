package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Editar el expediente de una partida captada, igual que un caso semilla: autorizada, sin PDF propio y dos veces. */
class EdicionPartidaCaptadaTest extends BaseApiTest {
    static final String SIMULADA = "SIM-99000505";
    static final String TRANSCRITA = "99000505";

    /** Vivienda completa, con área inscrita 90 y los cuatro planos sin presentar, como la envía la pantalla. */
    ObjectNode vivienda(String origen, String numero) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", origen);
        p.put("numero", numero);
        p.put("denominacion", "Mz. Z Lote 5 · Hab. Urb. Demostración · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-10-31");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        p.put("zonaRegistral", "Zona Registral N.° XI - Sede Ica");
        p.put("oficinaRegistral", "Oficina Registral de Ica");
        p.put("ubicacion", "Mz. Z, Lote 5, distrito de Ica.");
        p.put("areaM2", 160.00);
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Se inscribe el dominio a favor de Inmobiliaria Demo Sur S.A.C. (100 %).");
        c.put("titulares", "Inmobiliaria Demo Sur S.A.C. (100 %)");
        p.put("tipoPredio", "VIVIENDA");
        p.put("areaConstruidaInscrita", 90);
        ArrayNode planos = p.putArray("planos");
        for (String especialidad : new String[] {"ARQUITECTURA", "ESTRUCTURAS", "ELECTRICAS", "SANITARIAS"}) {
            ObjectNode n = planos.addObject();
            n.put("especialidad", especialidad);
            n.put("estado", "NO_PRESENTADO");
        }
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-02");
        return p;
    }

    void registrarYAutorizar(ObjectNode cuerpo) throws Exception {
        String numero = cuerpo.get("numero").asString();
        mvc.perform(post("/api/v1/casos").header("Authorization", revisor()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(cuerpo))).andExpect(status().isCreated());
        mvc.perform(put("/api/v1/casos/" + numero + "/autorizacion").header("Authorization", propietario(2)))
                .andExpect(status().isOk());
    }

    void marcarPlano(ObjectNode peticion, String especialidad, String estado) {
        for (var plano : peticion.get("planos")) {
            if (plano.get("especialidad").asString().equals(especialidad)) {
                ((ObjectNode) plano).put("estado", estado);
                ((ObjectNode) plano).remove("observacion");
            }
        }
    }

    List<String> origenes(String codigo) throws Exception {
        String r = mvc.perform(get("/api/v1/casos/" + codigo + "/historial").header("Authorization", revisor()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(r).findValuesAsString("origen");
    }

    /** Presentar los planos recalcula; una segunda edición, sin tocar planos ni asientos, queda como EDICION. */
    void editarDosVeces(String codigo, String origenRegistro) throws Exception {
        ObjectNode p = peticion(leerComo(codigo, revisor()));
        marcarPlano(p, "ARQUITECTURA", "PRESENTADO");
        marcarPlano(p, "ESTRUCTURAS", "PRESENTADO");
        actualizarExpediente(codigo, revisor(), p).andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                .andExpect(jsonPath("$.expediente.completitud").value("COMPLETA"));
        assertThat(origenes(codigo)).containsExactly(origenRegistro, "PLANO_ADJUNTO");

        ObjectNode segunda = peticion(leerComo(codigo, revisor()));
        segunda.put("nota", "Extracto revisado.");
        actualizarExpediente(codigo, revisor(), segunda).andExpect(status().isOk())
                .andExpect(jsonPath("$.expediente.nota").value("Extracto revisado."));
        assertThat(origenes(codigo)).containsExactly(origenRegistro, "PLANO_ADJUNTO", "EDICION");
    }

    @Test
    @DisplayName("Una partida simulada autorizada se edita dos veces: da 200, recalcula y agrega filas al historial")
    void simulada() throws Exception {
        try {
            registrarYAutorizar(vivienda("SIMULADA_DEMOSTRACION", SIMULADA));
            editarDosVeces(SIMULADA, "PARTIDA_SIMULADA");
        } finally {
            mvc.perform(delete("/api/v1/casos/" + SIMULADA).header("Authorization", revisor()));
        }
    }

    @Test
    @DisplayName("Una partida transcrita autorizada se edita dos veces: da 200, recalcula y agrega filas al historial")
    void transcrita() throws Exception {
        try {
            registrarYAutorizar(vivienda("TRANSCRITA_CONOCE_AQUI", TRANSCRITA));
            editarDosVeces(TRANSCRITA, "PARTIDA_TRANSCRITA");
        } finally {
            mvc.perform(delete("/api/v1/casos/" + TRANSCRITA).header("Authorization", revisor()));
        }
    }

    @Test
    @DisplayName("Control: el caso semilla SIM-11104029 se sigue editando y agrega una fila al historial")
    void semilla() throws Exception {
        JsonNode original = leer(ICA);
        int filas = origenes(ICA).size();
        try {
            ObjectNode p = peticion(leerComo(ICA, revisor()));
            marcarPlano(p, "ESTRUCTURAS", "PRESENTADO");
            actualizarExpediente(ICA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"));
            assertThat(origenes(ICA)).hasSize(filas + 1).last().isEqualTo("PLANO_ADJUNTO");
        } finally {
            restaurar(ICA, original);
        }
    }
}
