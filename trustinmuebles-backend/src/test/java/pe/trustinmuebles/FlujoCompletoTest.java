package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Recorre el flujo demo completo contra la API real (H2 en modo PostgreSQL, datos semilla incluidos). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FlujoCompletoTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    private String token(String email) throws Exception {
        String r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"demo1234\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(r).get("token").asString();
    }

    @Test
    @Order(1)
    void semaforoDeLasPropiedadesSembradas() throws Exception {
        String r = mvc.perform(get("/api/v1/inmuebles")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(8))).andReturn().getResponse().getContentAsString();
        JsonNode lista = json.readTree(r);
        String[] esperado = { "VERDE", "VERDE", "VERDE", "AMARILLO", "ROJO", "AMARILLO", "ROJO", "VERDE" };
        for (JsonNode n : lista) {
            assertThat(n.get("legal").asString()).as("inmueble " + n.get("id")).isEqualTo(esperado[n.get("id").asInt() - 1]);
        }
    }

    @Test
    @Order(2)
    void detalleExplicaElRiesgoEnLenguajeSimple() throws Exception {
        mvc.perform(get("/api/v1/inmuebles/5")).andExpect(status().isOk())
                .andExpect(jsonPath("$.semaforo.nivel").value("ROJO"))
                .andExpect(jsonPath("$.semaforo.gravamenes").value("ROJO"))
                .andExpect(jsonPath("$.semaforo.hallazgos[?(@.codigo=='GRAV_EMBARGO')].explicacionSimple", not(empty())))
                .andExpect(jsonPath("$.inspeccion.inspeccion.pines", not(empty())));
        mvc.perform(get("/api/v1/inmuebles/1/partida")).andExpect(status().isOk())
                .andExpect(jsonPath("$.asientos[0].explicacionSimple", not(emptyString())));
    }

    @Test
    @Order(3)
    void sinTokenNoSePuedeVerElTramite() throws Exception {
        mvc.perform(get("/api/v1/transacciones/mias")).andExpect(status().isUnauthorized());
    }

    @Test
    @Order(4)
    void luzRojaImpideAprobarLaAuditoria() throws Exception {
        String juan = token("juan.perez@demo.pe");
        String r = mvc.perform(post("/api/v1/transacciones").header("Authorization", juan)
                .contentType(MediaType.APPLICATION_JSON).content("{\"inmuebleId\":5}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.etapa").value("OFERTA_ACEPTADA"))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(r).get("id").asLong();

        mvc.perform(patch("/api/v1/transacciones/" + id + "/etapa").header("Authorization", token("maria.fernandez@demo.pe"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"AUDITORIA_APROBADA\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail", containsString("ROJO")));
        // un comprador no puede cambiar etapas
        mvc.perform(patch("/api/v1/transacciones/" + id + "/etapa").header("Authorization", juan)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"AUDITORIA_APROBADA\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    void rn02TicketsSoloConPropiedadFinalizadaYPlanoDeLaVivienda() throws Exception {
        String juan = token("juan.perez@demo.pe");
        String r = mvc.perform(get("/api/v1/postventa/resumen").header("Authorization", juan))
                .andExpect(status().isOk()).andExpect(jsonPath("$.propiedades", hasSize(1)))
                .andExpect(jsonPath("$.propiedades[0].inmueble.id").value(1))
                .andReturn().getResponse().getContentAsString();
        long propiedad = json.readTree(r).get("propiedades").get(0).get("id").asLong();

        mvc.perform(post("/api/v1/tickets").header("Authorization", juan).contentType(MediaType.APPLICATION_JSON)
                .content("{\"propiedadId\":" + propiedad + ",\"titulo\":\"Filtración baño\",\"pinX\":0.4,\"pinY\":0.5}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.estado").value("REPORTADO"))
                .andExpect(jsonPath("$.planoId").value(1));
        // plano de otra vivienda -> RN-02
        mvc.perform(post("/api/v1/tickets").header("Authorization", juan).contentType(MediaType.APPLICATION_JSON)
                .content("{\"propiedadId\":" + propiedad + ",\"titulo\":\"x\",\"planoId\":2}"))
                .andExpect(status().isUnprocessableEntity());
        // otro usuario no puede usar la propiedad de Juan
        mvc.perform(post("/api/v1/tickets").header("Authorization", token("rosa.huaman@demo.pe"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"propiedadId\":" + propiedad + ",\"titulo\":\"x\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(6)
    void firmarLaMinutaAvanzaYFinalizarActivaPostventa() throws Exception {
        String juan = token("juan.perez@demo.pe");
        String maria = token("maria.fernandez@demo.pe");
        String r = mvc.perform(get("/api/v1/transacciones/2").header("Authorization", juan))
                .andExpect(status().isOk()).andExpect(jsonPath("$.etapa").value("FIRMA_MINUTA"))
                .andReturn().getResponse().getContentAsString();
        long minuta = 0;
        for (JsonNode d : json.readTree(r).get("documentos")) if (d.get("tipo").asString().equals("MINUTA")) minuta = d.get("id").asLong();

        mvc.perform(post("/api/v1/documentos/" + minuta + "/firmar").header("Authorization", maria))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/documentos/" + minuta + "/firmar").header("Authorization", juan))
                .andExpect(status().isOk()).andExpect(jsonPath("$.etapa").value("ESCRITURA_PUBLICA"));
        mvc.perform(patch("/api/v1/transacciones/2/etapa").header("Authorization", maria)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"FINALIZADA\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.etapa").value("FINALIZADA"));
        mvc.perform(get("/api/v1/postventa/resumen").header("Authorization", juan))
                .andExpect(jsonPath("$.propiedades", hasSize(2)));
        mvc.perform(get("/api/v1/documentos/" + minuta + "/descarga").header("Authorization", juan))
                .andExpect(status().isOk()).andExpect(header().string("Content-Type", "application/pdf"));
    }

    @Test
    @Order(7)
    void laCadenaDeHashDetectaAlteraciones() throws Exception {
        String juan = token("juan.perez@demo.pe");
        mvc.perform(get("/api/v1/transacciones/1/integridad").header("Authorization", juan))
                .andExpect(jsonPath("$.valida").value(true)).andExpect(jsonPath("$.eventos", greaterThan(3)));
        jdbc.update("update evento_timeline set descripcion = 'alterado' where id = (select min(id) from evento_timeline where transaccion_id = 1)");
        mvc.perform(get("/api/v1/transacciones/1/integridad").header("Authorization", juan))
                .andExpect(jsonPath("$.valida").value(false)).andExpect(jsonPath("$.primerEventoInvalido").isNumber());
    }

    @Test
    @Order(8)
    void metricasSoloParaAdmin() throws Exception {
        mvc.perform(get("/api/v1/admin/metricas").header("Authorization", token("juan.perez@demo.pe")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/metricas").header("Authorization", token("admin@demo.pe")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.distribucionSemaforo.ROJO").value(2));
    }
}
