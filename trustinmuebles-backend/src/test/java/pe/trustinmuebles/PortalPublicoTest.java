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
 * v1.0 (etapa 1): portal público sin sesión. Solo casos PUBLICADOS, en páginas de 24, con lo que ve el comprador: sin
 * semáforo de gestión, decisiones de captación ni código del propietario. Un borrador o un retirado dan 404 y escribir
 * sin sesión da 401. Base H2 propia porque crea, retira y publica casos.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:publico-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class PortalPublicoTest extends BaseApiTest {
    static final String BORRADOR = "77777701";

    JsonNode pagina(int n) throws Exception {
        return json.readTree(mvc.perform(get("/api/v1/publico/inmuebles").param("pagina", String.valueOf(n)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    ObjectNode partida(String numero) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "TRANSCRITA_CONOCE_AQUI");
        p.put("numero", numero);
        p.put("denominacion", "Mz. T Lote 3 · Urb. Los Sauces · Ica");
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
        p.put("propietarioCodigo", "propietario-01");
        return p;
    }

    @Test
    @DisplayName("Sin sesión se lista solo lo publicado, en páginas de 24, sin datos internos")
    void listaPublica() throws Exception {
        // v1.0 (etapa 3a): los casos publicados más los lotes de proyecto que se ofrecen.
        int publicados = ofrecidosEnCatalogo();
        JsonNode p = pagina(0);
        assertThat(p.get("tamano").asInt()).isEqualTo(24);
        assertThat(p.get("pagina").asInt()).isZero();
        assertThat(p.get("total").asInt()).isEqualTo(publicados);
        assertThat(p.get("totalPaginas").asInt()).isEqualTo((publicados + 23) / 24);
        assertThat(p.get("items")).hasSize(Math.min(24, publicados));
        for (JsonNode i : p.get("items")) {
            assertThat(i.has("gestion")).as("sin semáforo de gestión").isFalse();
            assertThat(i.has("propietarioCodigo")).isFalse();
            assertThat(i.has("decisiones")).isFalse();
            assertThat(i.get("estado").isNull()).as("el indicador A sí se muestra").isFalse();
            assertThat(i.get("predio").get("tipoInmueble").isNull()).isFalse();
        }
        String crudo = json.writeValueAsString(p);
        assertThat(crudo).doesNotContain("propietario-0").doesNotContain("comprador-0").doesNotContain("gestion");
        // Una página más allá del final viene vacía; una negativa es 400.
        assertThat(pagina(p.get("totalPaginas").asInt()).get("items")).isEmpty();
        mvc.perform(get("/api/v1/publico/inmuebles").param("pagina", "-1")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("La ficha pública es la del comprador, sin gestión, código del propietario ni cuentas de la inspección")
    void fichaPublica() throws Exception {
        String r = mvc.perform(get("/api/v1/publico/inmuebles/" + PARCONA)).andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value(PARCONA))
                .andExpect(jsonPath("$.evaluacion.estado").value("VERDE"))
                .andExpect(jsonPath("$.publicacion.estado").value("PUBLICADO"))
                .andExpect(jsonPath("$.publicacion.propietarioCodigo").value(nullValue()))
                .andExpect(jsonPath("$.gestion").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(r).doesNotContain("propietario-0").doesNotContain("comprador-0");
        // Un caso con inspección en curso: no expone la cuenta del solicitante ni la del especialista asignado.
        String conInspeccion = mvc.perform(get("/api/v1/publico/inmuebles/" + PACHACUTEC)).andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluacionTecnica.solicitanteCodigo").value(nullValue()))
                .andExpect(jsonPath("$.evaluacionTecnica.especialistaAsignadoCodigo").value(nullValue()))
                .andReturn().getResponse().getContentAsString();
        assertThat(conInspeccion).doesNotContain("comprador-0").doesNotContain("especialista-0");
        mvc.perform(get("/api/v1/publico/inmuebles/00000000")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Un borrador o un caso retirado dan 404 en el portal y no aparecen en la lista")
    void borradorYRetirado() throws Exception {
        String revisor = revisor();
        mvc.perform(post("/api/v1/casos").header("Authorization", revisor).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(partida(BORRADOR)))).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/publico/inmuebles/" + BORRADOR)).andExpect(status().isNotFound());
        assertThat(json.writeValueAsString(pagina(0))).doesNotContain(BORRADOR);

        // Publicado aparece; retirado deja de aparecer.
        mvc.perform(put("/api/v1/casos/" + BORRADOR + "/autorizacion").header("Authorization", propietario(1)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/casos/" + BORRADOR + "/publicacion").header("Authorization", gestor()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/publico/inmuebles/" + BORRADOR)).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/casos/" + BORRADOR + "/publicacion").header("Authorization", gestor()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/publico/inmuebles/" + BORRADOR)).andExpect(status().isNotFound());
        assertThat(json.writeValueAsString(pagina(0))).doesNotContain(BORRADOR);
    }

    @Test
    @DisplayName("Escribir sin sesión da 401, en el portal y en la API interna; leer la API interna también")
    void escrituraSinSesion() throws Exception {
        mvc.perform(post("/api/v1/publico/inmuebles")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/publico/inmuebles/" + PARCONA)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/publico/inmuebles/" + PARCONA)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/casos/" + PARCONA + "/contactos").contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\":\"INFORMACION_GENERAL\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/casos/" + PARCONA + "/publicacion")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/casos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/casos/" + PARCONA)).andExpect(status().isUnauthorized());
    }
}
