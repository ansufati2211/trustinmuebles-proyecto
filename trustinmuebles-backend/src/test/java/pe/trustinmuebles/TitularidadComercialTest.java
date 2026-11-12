package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v1.0 (etapa 1, migración V17): titularidad comercial del caso. En uno de la INMOBILIARIA la autorización la registra
 * el asesor o el gestor en su nombre, con autor y fecha en el historial; en uno PARTICULAR solo el propietario. En los
 * dos, publicar exige una autorización vigente. Base H2 propia para no alterar las demás pruebas.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:titularidad-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class TitularidadComercialTest extends BaseApiTest {
    static final MediaType JSON = MediaType.APPLICATION_JSON;

    String asesor() throws Exception {
        return token("asesor-01");
    }

    ObjectNode lote(String numero, String titularidad, String propietario) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "TRANSCRITA_CONOCE_AQUI");
        p.put("numero", numero);
        p.put("denominacion", "Mz. K Lote 11 · Urb. Los Sauces · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-11-10");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Inmobiliaria Los Sauces S.A.C. adquirió el predio por compraventa.");
        c.put("titulares", "Inmobiliaria Los Sauces S.A.C. (100 %)");
        p.put("confirmaSinDatosPersonales", true);
        if (titularidad != null) p.put("titularidadComercial", titularidad);
        if (propietario != null) p.put("propietarioCodigo", propietario);
        return p;
    }

    void registrar(ObjectNode cuerpo, String auth) throws Exception {
        mvc.perform(post("/api/v1/casos").header("Authorization", auth).contentType(JSON)
                .content(json.writeValueAsString(cuerpo))).andExpect(status().isCreated());
    }

    JsonNode autorizaciones(String codigo, String auth) throws Exception {
        return json.readTree(mvc.perform(get("/api/v1/casos/" + codigo + "/autorizaciones").header("Authorization", auth))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    @Test
    @DisplayName("V17: los casos existentes quedan PARTICULAR y el lote de Santiago es de la inmobiliaria, autorizado")
    void precarga() throws Exception {
        // Solo los casos de la carga (otras pruebas de esta clase crean casos propios).
        assertThat(jdbc.queryForList("select codigo from caso_lote where titularidad_comercial = 'INMOBILIARIA' "
                + "and codigo in (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", String.class, PARCONA, TINGUINA, SUBTANJALLA,
                LOS_AQUIJES, PUEBLO_NUEVO, SANTIAGO, SALAS, MOLINOS, PACHACUTEC, ICA, HUARMEY, SUPE))
                .containsExactly(SANTIAGO);
        for (String codigo : new String[] {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES}) {
            mvc.perform(get("/api/v1/casos/" + codigo).header("Authorization", revisor()))
                    .andExpect(jsonPath("$.publicacion.titularidadComercial").value("PARTICULAR"));
        }
        mvc.perform(get("/api/v1/casos/" + SANTIAGO).header("Authorization", gestor()))
                .andExpect(jsonPath("$.publicacion.titularidadComercial").value("INMOBILIARIA"))
                .andExpect(jsonPath("$.publicacion.autorizada").value(true))
                .andExpect(jsonPath("$.publicacion.estado").value("PUBLICADO"))
                .andExpect(jsonPath("$.predio.tipoInmueble").value("LOTE_URBANO"));
        JsonNode h = autorizaciones(SANTIAGO, asesor());
        assertThat(h).hasSize(1);
        assertThat(h.get(0).get("accion").asString()).isEqualTo("OTORGADA");
        assertThat(h.get(0).get("enNombreDe").asString()).isEqualTo("INMOBILIARIA");
        assertThat(h.get(0).get("cuentaCodigo").asString()).isEqualTo("asesor-01");
        assertThat(h.get(0).get("registradaEn").isNull()).isFalse();
    }

    @Test
    @DisplayName("INMOBILIARIA: el asesor o el gestor registran la autorización con autor y fecha; el propietario no")
    void inmobiliaria() throws Exception {
        String codigo = "66666611";
        String asesor = asesor();
        registrar(lote(codigo, "INMOBILIARIA", null), asesor);
        String color = leerComo(codigo, asesor).get("evaluacion").get("estado").asString();

        // Sin autorización no se publica.
        mvc.perform(post("/api/v1/casos/" + codigo + "/publicacion").header("Authorization", asesor))
                .andExpect(status().isUnprocessableEntity());
        // Ni un propietario ni el comprador ni el revisor la registran.
        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", propietario(1)))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", comprador()))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", revisor()))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", asesor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.autorizada").value(true))
                .andExpect(jsonPath("$.titularidadComercial").value("INMOBILIARIA"));
        // Autorizar dos veces conserva la primera fecha y no duplica el historial.
        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", gestor()))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/casos/" + codigo + "/publicacion").header("Authorization", gestor()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("PUBLICADO"));

        // El gestor retira la autorización: el caso publicado queda RETIRADO (I14).
        mvc.perform(delete("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", gestor()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("RETIRADO"))
                .andExpect(jsonPath("$.autorizada").value(false));

        JsonNode h = autorizaciones(codigo, revisor());
        assertThat(h).hasSize(2);
        assertThat(h.get(0).get("accion").asString()).isEqualTo("OTORGADA");
        assertThat(h.get(0).get("cuentaCodigo").asString()).isEqualTo("asesor-01");
        assertThat(h.get(0).get("enNombreDe").asString()).isEqualTo("INMOBILIARIA");
        assertThat(h.get(1).get("accion").asString()).isEqualTo("RETIRADA");
        assertThat(h.get(1).get("cuentaCodigo").asString()).isEqualTo("gestor-01");
        assertThat(h.get(1).get("registradaEn").isNull()).isFalse();
        assertThat(leerComo(codigo, asesor).get("evaluacion").get("estado").asString())
                .as("autorizar y publicar no cambian A").isEqualTo(color);

        // El comprador no consulta el historial de autorizaciones.
        mvc.perform(get("/api/v1/casos/" + codigo + "/autorizaciones").header("Authorization", comprador()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PARTICULAR: solo su propietario autoriza; el asesor y el gestor no, y sin autorización no se publica")
    void particular() throws Exception {
        String codigo = "66666612";
        // Sin titularidad indicada, el caso es PARTICULAR y exige propietario.
        mvc.perform(post("/api/v1/casos").header("Authorization", asesor()).contentType(JSON)
                .content(json.writeValueAsString(lote(codigo, null, null)))).andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("propietarioCodigo")));
        registrar(lote(codigo, null, "propietario-02"), asesor());
        mvc.perform(get("/api/v1/casos/" + codigo).header("Authorization", revisor()))
                .andExpect(jsonPath("$.publicacion.titularidadComercial").value("PARTICULAR"));

        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", asesor()))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", gestor()))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", propietario(1)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + codigo + "/publicacion").header("Authorization", gestor()))
                .andExpect(status().isUnprocessableEntity());

        mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", propietario(2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.autorizada").value(true));
        mvc.perform(post("/api/v1/casos/" + codigo + "/publicacion").header("Authorization", asesor()))
                .andExpect(status().isOk());

        JsonNode h = autorizaciones(codigo, propietario(2));
        assertThat(h).hasSize(1);
        assertThat(h.get(0).get("cuentaCodigo").asString()).isEqualTo("propietario-02");
        assertThat(h.get(0).get("enNombreDe").asString()).isEqualTo("PARTICULAR");
    }

    @Test
    @DisplayName("Una titularidad desconocida da 400")
    void titularidadDesconocida() throws Exception {
        mvc.perform(post("/api/v1/casos").header("Authorization", asesor()).contentType(JSON)
                .content(json.writeValueAsString(lote("66666613", "SOCIEDAD", "propietario-01"))))
                .andExpect(status().isBadRequest());
    }
}
