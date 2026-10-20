package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.node.ObjectNode;

/** Indicador B: la evaluación técnica presencial la solicita el comprador y la emite solo el especialista. */
class InspeccionTest extends BaseApiTest {

    String especialista() throws Exception {
        return token("especialista-01");
    }

    ObjectNode informe(String estado) {
        ObjectNode i = json.createObjectNode();
        i.put("estado", estado);
        i.put("resultado", "CON_OBSERVACIONES");
        i.put("profesional", "Ing. Civil Hernán Gustavo Paredes Lazo");
        i.put("colegiatura", "CIP SIM-0001");
        i.put("fechaInspeccion", "2026-10-12");
        i.put("verifArquitectura", "CONFORME");
        i.put("verifEstructuras", "CONFORME");
        i.put("verifElectricas", "OBSERVADO");
        i.put("verifSanitarias", "CONFORME");
        i.put("observaciones", "Cableado antiguo sin llave diferencial.");
        i.put("conclusiones", "Observaciones subsanables con mantenimiento.");
        i.put("estudiosAdicionales", "Medición de aislamiento eléctrico.");
        return i;
    }

    ResultActions solicitar(String codigo, String autorizacion) throws Exception {
        return mvc.perform(post("/api/v1/casos/" + codigo + "/inspeccion/solicitud").header("Authorization", autorizacion));
    }

    ResultActions emitir(String codigo, String autorizacion, ObjectNode cuerpo) throws Exception {
        return mvc.perform(put("/api/v1/casos/" + codigo + "/inspeccion").header("Authorization", autorizacion)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)));
    }

    void limpiar(String codigo) {
        jdbc.update("delete from evaluacion_tecnica where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)", codigo);
    }

    @Test
    @DisplayName("Sin solicitud el indicador B dice «No solicitada» y que solo hubo revisión documental")
    void sinSolicitud() throws Exception {
        mvc.perform(get("/api/v1/casos/" + SUBTANJALLA).header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluacionTecnica.estado").value("NO_SOLICITADA"))
                .andExpect(jsonPath("$.evaluacionTecnica.limite", containsString("no acredita el estado físico")));
    }

    @Test
    @DisplayName("El comprador solicita (201), una segunda solicitud da 409 y el especialista emite el informe sin cambiar el color")
    void flujoCompleto() throws Exception {
        try {
            String colorAntes = leer(SUBTANJALLA).get("evaluacion").get("estado").asString();
            solicitar(SUBTANJALLA, comprador()).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.estado").value("SOLICITADA"));
            solicitar(SUBTANJALLA, comprador()).andExpect(status().isConflict());

            emitir(SUBTANJALLA, especialista(), informe("EMITIDO")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacionTecnica.estado").value("EMITIDO"))
                    .andExpect(jsonPath("$.evaluacionTecnica.resultado").value("CON_OBSERVACIONES"))
                    .andExpect(jsonPath("$.evaluacionTecnica.verifElectricas").value("OBSERVADO"))
                    .andExpect(jsonPath("$.evaluacionTecnica.limite", containsString("ensayos")));
            assertThat(leer(SUBTANJALLA).get("evaluacion").get("estado").asString())
                    .as("el informe técnico no cambia el semáforo documental").isEqualTo(colorAntes);
        } finally {
            limpiar(SUBTANJALLA);
        }
    }

    @Test
    @DisplayName("Solo el especialista emite: el comprador y el revisor reciben 403; sin solicitud el especialista recibe 409")
    void permisos() throws Exception {
        emitir(LOS_AQUIJES, comprador(), informe("EMITIDO")).andExpect(status().isForbidden());
        emitir(LOS_AQUIJES, revisor(), informe("EMITIDO")).andExpect(status().isForbidden());
        emitir(LOS_AQUIJES, especialista(), informe("EMITIDO")).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/casos/" + LOS_AQUIJES + "/inspeccion/solicitud")).andExpect(status().isUnauthorized());
        // El especialista no edita expedientes.
        actualizarExpediente(LOS_AQUIJES, especialista(), peticion(leer(LOS_AQUIJES))).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un informe emitido exige resultado, fecha, las 4 verificaciones y conclusiones (el profesional sale de la cuenta)")
    void validaElInforme() throws Exception {
        try {
            solicitar(LOS_AQUIJES, comprador()).andExpect(status().isCreated());
            // v0.6 (M8): el nombre y la colegiatura ya no se validan en el cuerpo; los pone el servidor desde la cuenta.
            for (String campo : new String[] {"resultado", "fechaInspeccion", "verifSanitarias", "conclusiones"}) {
                ObjectNode i = informe("EMITIDO");
                i.remove(campo);
                emitir(LOS_AQUIJES, especialista(), i).andExpect(status().isBadRequest());
            }
            ObjectNode futuro = informe("EMITIDO");
            futuro.put("fechaInspeccion", "2999-01-01");
            emitir(LOS_AQUIJES, especialista(), futuro).andExpect(status().isBadRequest());
            emitir(LOS_AQUIJES, especialista(), informe("SOLICITADA")).andExpect(status().isBadRequest());
            // En curso no exige el resultado.
            ObjectNode enCurso = informe("EN_INSPECCION");
            enCurso.remove("resultado");
            emitir(LOS_AQUIJES, especialista(), enCurso).andExpect(status().isOk())
                    .andExpect(jsonPath("$.evaluacionTecnica.estado").value("EN_INSPECCION"));
        } finally {
            limpiar(LOS_AQUIJES);
        }
    }

    @Test
    @DisplayName("Los casos de demostración traen su informe: Parcona favorable y La Tinguiña con observaciones")
    void informesDeDemostracion() throws Exception {
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacionTecnica.estado").value("EMITIDO"))
                .andExpect(jsonPath("$.evaluacionTecnica.resultado").value("FAVORABLE"));
        mvc.perform(get("/api/v1/casos/" + TINGUINA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.evaluacionTecnica.resultado").value("CON_OBSERVACIONES"))
                .andExpect(jsonPath("$.evaluacionTecnica.observaciones", containsString("llave diferencial")))
                .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"));
    }

    @Test
    @DisplayName("El informe técnico en PDF existe solo cuando fue emitido; antes da 404")
    void informeEnPdf() throws Exception {
        byte[] pdf = mvc.perform(get("/api/v1/casos/" + TINGUINA + "/inspeccion/documento").header("Authorization", comprador()))
                .andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
                .andReturn().getResponse().getContentAsByteArray();
        try (var doc = org.apache.pdfbox.Loader.loadPDF(pdf)) {
            assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(doc))
                    .contains("INFORME TÉCNICO DE INSPECCIÓN (REFERENCIAL)", "llave diferencial");
        }
        mvc.perform(get("/api/v1/casos/" + SUBTANJALLA + "/inspeccion/documento").header("Authorization", comprador()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/" + PACHACUTEC + "/inspeccion/documento").header("Authorization", comprador()))
                .andExpect(status().isNotFound()); // en inspección: aún no hay informe emitido
        mvc.perform(get("/api/v1/casos/" + TINGUINA + "/inspeccion/documento")).andExpect(status().isUnauthorized());
    }
}
