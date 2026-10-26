package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v0.7 (F1): captación (etapa 1) y publicación (etapa 5). Invariantes I8 (publicar o autorizar no cambia el color),
 * I10 (publicar no depende del color), I13 (el propietario solo autoriza lo suyo) e I14 (sin autorización no se publica).
 */
class CaptacionPublicacionTest extends BaseApiTest {
    static final String BORRADOR = "88888888";

    /** Partida transcrita mínima, sin datos personales, del propietario indicado. */
    ObjectNode partida(String numero, String propietario) {
        ObjectNode p = json.createObjectNode();
        p.put("numero", numero);
        p.put("denominacion", "Mz. H Lote 2 · Hab. Urb. Los Sauces · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-10-17");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Inmobiliaria Los Sauces S.A.C. adquirió el predio por compraventa.");
        c.put("titulares", "Inmobiliaria Los Sauces S.A.C. (100 %)");
        p.put("confirmaSinDatosPersonales", true);
        if (propietario != null) p.put("propietarioCodigo", propietario);
        return p;
    }

    ResultActions registrar(ObjectNode cuerpo) throws Exception {
        return mvc.perform(post("/api/v1/casos").header("Authorization", revisor())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)));
    }

    ResultActions autorizar(String codigo, String auth) throws Exception {
        return mvc.perform(put("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", auth));
    }

    ResultActions retirarAutorizacion(String codigo, String auth) throws Exception {
        return mvc.perform(delete("/api/v1/casos/" + codigo + "/autorizacion").header("Authorization", auth));
    }

    ResultActions publicar(String codigo, String auth) throws Exception {
        return mvc.perform(post("/api/v1/casos/" + codigo + "/publicacion").header("Authorization", auth));
    }

    ResultActions retirar(String codigo, String auth) throws Exception {
        return mvc.perform(delete("/api/v1/casos/" + codigo + "/publicacion").header("Authorization", auth));
    }

    void borrar(String codigo) throws Exception {
        mvc.perform(delete("/api/v1/casos/" + codigo).header("Authorization", revisor()));
    }

    List<String> codigos(String auth) throws Exception {
        String r = mvc.perform(get("/api/v1/casos").header("Authorization", auth)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> lista = new ArrayList<>();
        json.readTree(r).forEach(c -> lista.add(c.get("codigo").asString()));
        return lista;
    }

    String especialista() throws Exception {
        return token("especialista-01");
    }

    // ------------------------------------------------------------------ captación

    @Test
    @DisplayName("Etapa 1: el revisor indica el propietario; el caso nace en BORRADOR y sin autorización")
    void naceEnBorrador() throws Exception {
        try {
            registrar(partida(BORRADOR, "propietario-02")).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.publicacion.estado").value("BORRADOR"))
                    .andExpect(jsonPath("$.publicacion.propietarioCodigo").value("propietario-02"))
                    .andExpect(jsonPath("$.publicacion.autorizada").value(false))
                    .andExpect(jsonPath("$.publicacion.autorizacionFecha").value(nullValue()));
        } finally {
            borrar(BORRADOR);
        }
    }

    @Test
    @DisplayName("Etapa 1: sin propietario, o con una cuenta que no es de propietario, da 400 y no guarda nada")
    void propietarioObligatorio() throws Exception {
        registrar(partida(BORRADOR, null)).andExpect(status().isBadRequest());
        registrar(partida(BORRADOR, "revisor-01")).andExpect(status().isBadRequest());
        registrar(partida(BORRADOR, "no-existe")).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo = ?", Integer.class, BORRADOR))
                .isZero();
    }

    @Test
    @DisplayName("I13: el revisor no autoriza por el propietario y un propietario no actúa sobre casos ajenos (403)")
    void autorizacionSoloDelPropietario() throws Exception {
        try {
            registrar(partida(BORRADOR, "propietario-01")).andExpect(status().isCreated());
            autorizar(BORRADOR, revisor()).andExpect(status().isForbidden());
            autorizar(BORRADOR, gestor()).andExpect(status().isForbidden());
            autorizar(BORRADOR, comprador()).andExpect(status().isForbidden());
            autorizar(BORRADOR, especialista()).andExpect(status().isForbidden());
            autorizar(BORRADOR, propietario(2)).andExpect(status().isForbidden());
            retirarAutorizacion(BORRADOR, propietario(2)).andExpect(status().isForbidden());
            assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo = ? and autorizacion_fecha is null",
                    Integer.class, BORRADOR)).as("nadie más pudo autorizar").isEqualTo(1);

            autorizar(BORRADOR, propietario(1)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.autorizada").value(true))
                    .andExpect(jsonPath("$.autorizacionFecha").value(notNullValue()));
            retirarAutorizacion(BORRADOR, propietario(1)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.autorizada").value(false));
        } finally {
            borrar(BORRADOR);
        }
    }

    @Test
    @DisplayName("I13: el propietario no edita, no sube archivos, no publica ni cambia el checklist (403)")
    void propietarioSoloLectura() throws Exception {
        String p1 = propietario(1);
        JsonNode antes = leerComo(PARCONA, revisor());
        actualizarExpediente(PARCONA, p1, peticion(antes)).andExpect(status().isForbidden());
        var pdf = new org.springframework.mock.web.MockMultipartFile("documento", "x.pdf", "application/pdf",
                "%PDF-1.4".getBytes());
        mvc.perform(multipart("/api/v1/casos/" + PARCONA + "/documento").file(pdf).header("Authorization", p1))
                .andExpect(status().isForbidden());
        mvc.perform(multipart("/api/v1/casos/" + PARCONA + "/planos/ESTRUCTURAS/documento").file(pdf)
                .header("Authorization", p1)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/1").header("Authorization", p1)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"REVISADO\"}"))
                .andExpect(status().isForbidden());
        publicar(PARCONA, p1).andExpect(status().isForbidden());
        retirar(PARCONA, p1).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + PARCONA + "/inspeccion/solicitud").header("Authorization", p1))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/casos/" + PARCONA).header("Authorization", p1)).andExpect(status().isForbidden());
        assertThat(leerComo(PARCONA, revisor())).isEqualTo(antes);
    }

    // ------------------------------------------------------------------ publicación

    @Test
    @DisplayName("Etapa 5: solo el gestor publica o retira; los demás roles reciben 403")
    void soloElGestorPublica() throws Exception {
        for (String auth : new String[] {revisor(), comprador(), especialista(), propietario(1)}) {
            publicar(PUEBLO_NUEVO, auth).andExpect(status().isForbidden());
            retirar(PUEBLO_NUEVO, auth).andExpect(status().isForbidden());
        }
        assertThat(codigos(comprador())).contains(PUEBLO_NUEVO);
    }

    @Test
    @DisplayName("I14: publicar sin autorización vigente se rechaza (422) y el caso sigue en borrador")
    void sinAutorizacionNoSePublica() throws Exception {
        try {
            registrar(partida(BORRADOR, "propietario-01")).andExpect(status().isCreated());
            publicar(BORRADOR, gestor()).andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.detail", containsString("no ha autorizado")));
            assertThat(leerComo(BORRADOR, gestor()).get("publicacion").get("estado").asString()).isEqualTo("BORRADOR");
            mvc.perform(get("/api/v1/casos/" + BORRADOR).header("Authorization", comprador()))
                    .andExpect(status().isNotFound());
        } finally {
            borrar(BORRADOR);
        }
    }

    @Test
    @DisplayName("I10 e I8: un caso rojo con autorización se publica; retirar y publicar no cambian el color ni recalculan")
    void publicarRojoNoCambiaElColor() throws Exception {
        JsonNode antes = leerComo(PUEBLO_NUEVO, revisor()).get("evaluacion");
        assertThat(antes.get("estado").asString()).isEqualTo("ROJO");
        int historial = filasHistorial(PUEBLO_NUEVO);
        try {
            retirar(PUEBLO_NUEVO, gestor()).andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("RETIRADO"));
            retirar(PUEBLO_NUEVO, gestor()).andExpect(status().isConflict());
            publicar(PUEBLO_NUEVO, gestor()).andExpect(status().isOk())
                    .andExpect(jsonPath("$.estado").value("PUBLICADO"));
            publicar(PUEBLO_NUEVO, gestor()).andExpect(status().isConflict());
        } finally {
            if (!"PUBLICADO".equals(estado(PUEBLO_NUEVO))) publicar(PUEBLO_NUEVO, gestor());
        }
        JsonNode despues = leerComo(PUEBLO_NUEVO, revisor()).get("evaluacion");
        assertThat(despues).as("ni el color ni la evaluación cambian").isEqualTo(antes);
        assertThat(filasHistorial(PUEBLO_NUEVO)).as("publicar no es un recálculo").isEqualTo(historial);
    }

    @Test
    @DisplayName("I8: autorizar y retirar la autorización no cambian el color; retirarla despublica (I14)")
    void autorizarNoCambiaElColor() throws Exception {
        JsonNode antes = leerComo(TINGUINA, revisor()).get("evaluacion");
        try {
            retirarAutorizacion(TINGUINA, propietario(2)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.estado").value("RETIRADO"))
                    .andExpect(jsonPath("$.autorizada").value(false));
            mvc.perform(get("/api/v1/casos/" + TINGUINA).header("Authorization", comprador()))
                    .andExpect(status().isNotFound());
            publicar(TINGUINA, gestor()).andExpect(status().isUnprocessableEntity());
            autorizar(TINGUINA, propietario(2)).andExpect(status().isOk()).andExpect(jsonPath("$.autorizada").value(true));
            publicar(TINGUINA, gestor()).andExpect(status().isOk());
        } finally {
            if (!"PUBLICADO".equals(estado(TINGUINA))) {
                autorizar(TINGUINA, propietario(2));
                publicar(TINGUINA, gestor());
            }
        }
        assertThat(leerComo(TINGUINA, revisor()).get("evaluacion")).isEqualTo(antes);
    }

    // ------------------------------------------------------------------ visibilidad

    @Test
    @DisplayName("Visibilidad: el comprador solo ve publicados (404 en otro caso); el equipo ve todo")
    void visibilidadPorRol() throws Exception {
        try {
            registrar(partida(BORRADOR, "propietario-01")).andExpect(status().isCreated());
            retirar(SANTIAGO, gestor()).andExpect(status().isOk());

            assertThat(codigos(comprador())).hasSize(9).doesNotContain(BORRADOR, SANTIAGO);
            for (String ruta : new String[] {"", "/documento", "/planos/ARQUITECTURA/documento",
                    "/inspeccion/documento"}) {
                mvc.perform(get("/api/v1/casos/" + SANTIAGO + ruta).header("Authorization", comprador()))
                        .andExpect(status().isNotFound());
            }
            mvc.perform(post("/api/v1/casos/" + SANTIAGO + "/inspeccion/solicitud").header("Authorization", comprador()))
                    .andExpect(status().isNotFound());
            for (String auth : new String[] {revisor(), gestor(), especialista()}) {
                assertThat(codigos(auth)).hasSize(11).contains(BORRADOR, SANTIAGO);
                mvc.perform(get("/api/v1/casos/" + SANTIAGO).header("Authorization", auth)).andExpect(status().isOk())
                        .andExpect(jsonPath("$.publicacion.estado").value("RETIRADO"));
            }
        } finally {
            if (!"PUBLICADO".equals(estado(SANTIAGO))) publicar(SANTIAGO, gestor());
            borrar(BORRADOR);
        }
        assertThat(codigos(comprador())).hasSize(10);
    }

    @Test
    @DisplayName("Visibilidad: cada propietario ve solo sus casos; los ajenos dan 404")
    void propietarioVeSoloLoSuyo() throws Exception {
        List<String> p1 = codigos(propietario(1));
        List<String> p2 = codigos(propietario(2));
        assertThat(p1).containsExactly(PARCONA, SUBTANJALLA, PUEBLO_NUEVO, SALAS, PACHACUTEC);
        assertThat(p2).containsExactly(TINGUINA, LOS_AQUIJES, SANTIAGO, MOLINOS, ICA);
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", propietario(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.publicacion.propietarioCodigo").value("propietario-01"));
        mvc.perform(get("/api/v1/casos/" + TINGUINA).header("Authorization", propietario(1)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/casos/" + TINGUINA + "/documento").header("Authorization", propietario(1)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("I11: el comprador no ve el código del propietario; los diez casos siguen publicados y autorizados")
    void demostracionPublicada() throws Exception {
        mvc.perform(get("/api/v1/casos/" + PARCONA).header("Authorization", comprador()))
                .andExpect(jsonPath("$.publicacion.estado").value("PUBLICADO"))
                .andExpect(jsonPath("$.publicacion.autorizada").value(true))
                .andExpect(jsonPath("$.publicacion.propietarioCodigo").value(nullValue()));
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where sintetico = true and estado_publicacion = "
                + "'PUBLICADO' and autorizacion_fecha is not null and propietario_codigo is not null", Integer.class))
                .isEqualTo(10);
        mvc.perform(get("/api/v1/casos").header("Authorization", comprador()))
                .andExpect(jsonPath("$[*].estadoPublicacion", everyItem(is("PUBLICADO"))));
    }

    String estado(String codigo) {
        return jdbc.queryForObject("select estado_publicacion from caso_lote where codigo = ?", String.class, codigo);
    }

    /** Filas de historial del caso (F2). Antes de F2 la tabla no existe y se cuenta como 0. */
    int filasHistorial(String codigo) {
        try {
            return jdbc.queryForObject("select count(*) from historial_evaluacion where expediente_id = "
                    + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)",
                    Integer.class, codigo);
        } catch (org.springframework.jdbc.BadSqlGrammarException e) {
            return 0;
        }
    }
}
