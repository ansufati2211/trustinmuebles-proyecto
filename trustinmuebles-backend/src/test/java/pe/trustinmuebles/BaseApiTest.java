package pe.trustinmuebles;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Base de las pruebas de integración: H2 en memoria con el contenido v0.1 ya cargado y las cuentas de prueba.
 * Las pruebas que modifican un caso lo restauran al terminar, así que el orden de ejecución no importa.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseApiTest {
    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected JdbcTemplate jdbc;
    @Value("${app.seed.password}") protected String password;

    protected String token(String codigoCuenta) throws Exception {
        String r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigoCuenta\":\"" + codigoCuenta + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(r).get("token").asString();
    }

    protected String comprador() throws Exception {
        return token("comprador-01");
    }

    protected String revisor() throws Exception {
        return token("revisor-01");
    }

    protected JsonNode leer(String codigo) throws Exception {
        String r = mvc.perform(get("/api/v1/casos/" + codigo).header("Authorization", comprador()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(r);
    }

    protected ResultActions actualizarExpediente(String codigo, String authorization, ObjectNode cuerpo) throws Exception {
        return mvc.perform(put("/api/v1/casos/" + codigo + "/expediente").header("Authorization", authorization)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)));
    }

    /** Petición de actualización construida desde el expediente tal como está, para modificar solo lo que se prueba. */
    protected ObjectNode peticion(JsonNode detalle) {
        JsonNode e = detalle.get("expediente");
        ObjectNode p = json.createObjectNode();
        p.put("condicionRepresentada", e.get("condicionRepresentada").asString());
        p.put("titularidad", e.get("titularidad").asString());
        p.put("completitud", e.get("completitud").asString());
        p.put("fechaReferencial", e.get("fechaReferencial").asString());
        if (e.hasNonNull("nota")) p.put("nota", e.get("nota").asString());
        var anots = p.putArray("anotaciones");
        for (JsonNode a : e.get("anotaciones")) {
            ObjectNode n = anots.addObject();
            n.put("referencia", a.get("referencia").asString());
            n.put("estado", a.get("estado").asString());
            if (a.hasNonNull("descripcion")) n.put("descripcion", a.get("descripcion").asString());
        }
        p.put("versionEsperada", e.get("version").asLong());
        return p;
    }

    /** Devuelve el caso a su contenido original usando la versión actual. */
    protected void restaurar(String codigo, JsonNode original) throws Exception {
        ObjectNode p = peticion(original);
        p.put("versionEsperada", leer(codigo).get("expediente").get("version").asLong());
        actualizarExpediente(codigo, revisor(), p).andExpect(status().isOk());
    }
}
