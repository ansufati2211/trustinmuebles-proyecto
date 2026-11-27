package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v2.0 (tanda 2): asesor asignado y vista propia (RF32, RN28), citas con tipo y dos fechas (RF35), seguimiento por etapas
 * (RF36), aviso del día (RF37) y estado del lote con separación y liberación (RF41, RF42, RN29 a RN31). Base H2 propia y
 * tres cuentas de asesor sin coordinación (asesor-02, asesor-03 y asesor-04, que nunca recibe nada); asesor-01 y el
 * gestor coordinan.
 */
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:tanda2-${random.uuid};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;"
                + "DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
        "app.asesores=asesor-01,asesor-02,asesor-03,asesor-04"})
class Tanda2Test extends BaseApiTest {
    static final String VERSION = "2026-11-v1";
    static final String VENTISCA = "altos-de-ventisca";
    static final LocalDate HOY = LocalDate.now(ZoneId.of("America/Lima"));
    static final AtomicInteger IP = new AtomicInteger(10);

    // ------------------------------------------------------------------ ayudas

    String coordinador() throws Exception {
        return token("asesor-01");
    }

    String asesor2() throws Exception {
        return token("asesor-02");
    }

    String asesor3() throws Exception {
        return token("asesor-03");
    }

    JsonNode leerJson(MockHttpServletRequestBuilder req) throws Exception {
        return json.readTree(mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    ResultActions json(MockHttpServletRequestBuilder req, String auth, String cuerpo) throws Exception {
        return mvc.perform(req.header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(cuerpo));
    }

    /** Crea un interesado desde el portal (sobre un lote, o búsqueda general si {@code lote} es null) y da su id. */
    long crear(String nombre, String lote) throws Exception {
        ObjectNode c = json.createObjectNode();
        c.put("nombre", nombre);
        c.put("medio", "CORREO");
        c.put("contacto", nombre.toLowerCase() + ".tanda@example.com");
        c.put("consentimiento", true);
        c.put("consentimientoVersion", VERSION);
        if (lote != null) {
            c.put("proyectoCodigo", VENTISCA);
            c.put("lote", lote);
        }
        mvc.perform(post("/api/v1/publico/interes").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(c)).with(r -> {
                    r.setRemoteAddr("10.2.0." + IP.incrementAndGet());
                    return r;
                })).andExpect(status().isCreated());
        return jdbc.queryForObject("select max(id) from interes", Long.class);
    }

    /** El coordinador asigna el interesado a una cuenta. */
    void asignar(long id, String cuenta) throws Exception {
        json(put("/api/v1/interesados/" + id + "/seguimiento"), coordinador(), "{\"responsable\":\"" + cuenta + "\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.interes.responsable").value(cuenta));
    }

    ResultActions etapa(long id, String auth, String etapa) throws Exception {
        return json(put("/api/v1/interesados/" + id + "/etapa"), auth, "{\"etapa\":\"" + etapa + "\"}");
    }

    ResultActions liberar(long id, String auth, String motivo) throws Exception {
        return json(post("/api/v1/interesados/" + id + "/liberacion"), auth,
                "{\"motivo\":\"" + motivo + "\",\"etapa\":\"ACUERDO\"}");
    }

    /** Un lote disponible, publicado y sin caso propio (el n-ésimo contando desde el final). */
    String loteDisponible(int n) throws Exception {
        JsonNode p = leerJson(get("/api/v1/publico/proyectos/" + VENTISCA));
        List<String> claves = new ArrayList<>();
        for (JsonNode l : p.get("lotes")) {
            if (l.get("publicado").asBoolean() && l.get("casoCodigo").isNull()
                    && l.get("estadoComercial").asString().equals("DISPONIBLE")) claves.add(l.get("clave").asString());
        }
        return claves.get(claves.size() - 1 - n);
    }

    /** El estado del lote como lo ve cualquier visitante (el plano público). */
    String estadoPublico(String clave) throws Exception {
        return leerJson(get("/api/v1/publico/proyectos/" + VENTISCA + "/lotes/" + clave)).get("lote")
                .get("estadoComercial").asString();
    }

    List<Long> idsEnBandeja(String auth) throws Exception {
        List<Long> ids = new ArrayList<>();
        leerJson(get("/api/v1/interesados").header("Authorization", auth)).forEach(i -> ids.add(i.get("id").asLong()));
        return ids;
    }

    // ------------------------------------------------------------------ RF32 y RN28

    @Test
    @DisplayName("RN28: el interesado asignado al asesor 2 aparece en su vista; el asesor 3 no lo ve ni por API directa (403)")
    void vistaPropia() throws Exception {
        long id = crear("Gabriela", null);
        asignar(id, "asesor-02");
        assertThat(idsEnBandeja(asesor2())).contains(id);
        assertThat(idsEnBandeja(asesor3())).doesNotContain(id);
        // El coordinador ve a todos.
        assertThat(idsEnBandeja(coordinador())).contains(id);
        assertThat(idsEnBandeja(gestor())).contains(id);

        String a3 = asesor3();
        mvc.perform(get("/api/v1/interesados/" + id).header("Authorization", a3)).andExpect(status().isForbidden());
        etapa(id, a3, "CONTACTADO").andExpect(status().isForbidden());
        json(post("/api/v1/interesados/" + id + "/notas"), a3, "{\"texto\":\"no debería\"}").andExpect(status().isForbidden());
        json(put("/api/v1/interesados/" + id + "/seguimiento"), a3, "{\"responsable\":\"asesor-03\"}")
                .andExpect(status().isForbidden());
        json(post("/api/v1/interesados/" + id + "/citas"), a3,
                "{\"tipo\":\"LLAMADA\",\"fecha\":\"" + HOY.plusDays(1) + "\",\"franja\":\"MANANA\"}")
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/interesados/" + id).header("Authorization", a3)).andExpect(status().isForbidden());
        // Ni en el CSV ni en el embudo.
        String csv = mvc.perform(get("/api/v1/interesados/exportar.csv").header("Authorization", a3)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(csv).doesNotContain("gabriela.tanda@example.com");
        long totalA3 = leerJson(get("/api/v1/interesados/embudo").header("Authorization", a3)).get("total").get("total").asLong();
        assertThat(totalA3).isEqualTo(idsEnBandeja(a3).size());

        // El asesor 2 sí lo gestiona, pero no puede pasárselo a otro asesor: eso lo hace un coordinador.
        mvc.perform(get("/api/v1/interesados/" + id).header("Authorization", asesor2())).andExpect(status().isOk());
        json(put("/api/v1/interesados/" + id + "/seguimiento"), asesor2(), "{\"responsable\":\"asesor-03\"}")
                .andExpect(status().isForbidden());
        // Uno sin asignar lo ven todos y quien lo toma queda a cargo.
        long libre = crear("Raquel", null);
        assertThat(idsEnBandeja(a3)).contains(libre);
        json(put("/api/v1/interesados/" + libre + "/seguimiento"), a3, "{\"responsable\":\"asesor-03\"}")
                .andExpect(status().isOk());
        assertThat(idsEnBandeja(asesor2())).doesNotContain(libre);
        mvc.perform(get("/api/v1/interesados/" + libre).header("Authorization", asesor2())).andExpect(status().isForbidden());
        JsonNode op = leerJson(get("/api/v1/interesados/opciones").header("Authorization", a3));
        assertThat(op.get("cuenta").asString()).isEqualTo("asesor-03");
        assertThat(op.get("veTodo").asBoolean()).isFalse();
        assertThat(leerJson(get("/api/v1/interesados/opciones").header("Authorization", coordinador())).get("veTodo")
                .asBoolean()).isTrue();
    }

    // ------------------------------------------------------------------ RF35

    @Test
    @DisplayName("RF35: una cita tipo reunión con fecha principal y opcional queda guardada y en la agenda del asesor")
    void citaConDosFechas() throws Exception {
        long id = crear("Ximena", null);
        asignar(id, "asesor-02");
        LocalDate principal = HOY.plusDays(2), opcional = HOY.plusDays(3);
        json(post("/api/v1/interesados/" + id + "/citas"), asesor2(), "{\"tipo\":\"REUNION_EN_OFICINA\",\"fecha\":\""
                + principal + "\",\"franja\":\"TARDE\",\"fechaOpcional\":\"" + opcional + "\",\"franjaOpcional\":\"MANANA\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.citas[0].modalidad").value("REUNION_EN_OFICINA"))
                .andExpect(jsonPath("$.citas[0].opciones", hasSize(2)))
                .andExpect(jsonPath("$.citas[0].opciones[0].fecha").value(principal.toString()))
                .andExpect(jsonPath("$.citas[0].opciones[1].fecha").value(opcional.toString()))
                .andExpect(jsonPath("$.citas[0].asesor").value("asesor-02"))
                .andExpect(jsonPath("$.interes.etapa").value("CITA_AGENDADA"));
        Map<String, Object> fila = jdbc.queryForMap("select * from cita where interes_id = ?", id);
        assertThat(fila.get("modalidad")).isEqualTo("REUNION_EN_OFICINA");
        assertThat(fila.get("fecha1").toString()).isEqualTo(principal.toString());
        assertThat(fila.get("fecha2").toString()).isEqualTo(opcional.toString());
        assertThat(fila.get("franja2")).isEqualTo("MANANA");
        assertThat(fila.get("asesor")).isEqualTo("asesor-02");
        assertThat(fila.get("estado")).isEqualTo("CONFIRMADA");
        // En la agenda del asesor, el día principal.
        JsonNode agenda = leerJson(get("/api/v1/citas/agenda").header("Authorization", asesor2()));
        boolean esta = false;
        for (JsonNode d : agenda.get("dias")) {
            if (!d.get("fecha").asString().equals(principal.toString())) continue;
            for (JsonNode c : d.get("citas")) esta |= c.get("cita").get("interesId").asLong() == id;
        }
        assertThat(esta).isTrue();
        // El otro asesor no la ve en su agenda.
        assertThat(mvc.perform(get("/api/v1/citas/agenda").header("Authorization", asesor3())).andReturn().getResponse()
                .getContentAsString()).doesNotContain("\"interesId\":" + id + ",");
        // Validaciones: sin tipo, fecha pasada, fecha opcional igual a la principal, campo desconocido.
        for (String malo : new String[] {"{\"fecha\":\"" + principal + "\",\"franja\":\"TARDE\"}",
                "{\"tipo\":\"LLAMADA\",\"fecha\":\"" + HOY.minusDays(1) + "\",\"franja\":\"TARDE\"}",
                "{\"tipo\":\"LLAMADA\",\"fecha\":\"" + principal + "\",\"franja\":\"TARDE\",\"fechaOpcional\":\"" + principal
                        + "\",\"franjaOpcional\":\"TARDE\"}",
                "{\"tipo\":\"LLAMADA\",\"fecha\":\"" + principal + "\",\"franja\":\"TARDE\",\"telefono\":\"x\"}"}) {
            json(post("/api/v1/interesados/" + id + "/citas"), asesor2(), malo).andExpect(status().isBadRequest());
        }
    }

    // ------------------------------------------------------------------ RF36

    @Test
    @DisplayName("RF36: mover de etapa queda con responsable y fecha, y el embudo refleja el cambio")
    void etapasConHistorial() throws Exception {
        long id = crear("Bruno", null);
        asignar(id, "asesor-02");
        long revisadosAntes = revisados();
        etapa(id, asesor2(), "CONTACTADO").andExpect(status().isOk());
        etapa(id, asesor2(), "REVISADO").andExpect(status().isOk())
                .andExpect(jsonPath("$.interes.etapa").value("REVISADO"))
                .andExpect(jsonPath("$.historialEtapas", hasSize(2)))
                .andExpect(jsonPath("$.historialEtapas[1].desde").value("CONTACTADO"))
                .andExpect(jsonPath("$.historialEtapas[1].hacia").value("REVISADO"))
                .andExpect(jsonPath("$.historialEtapas[1].cuentaCodigo").value("asesor-02"));
        Map<String, Object> h = jdbc.queryForMap("select * from historial_etapa_interes where interes_id = ? "
                + "order by id desc limit 1", id);
        assertThat(h.get("cuenta_codigo")).isEqualTo("asesor-02");
        assertThat(h.get("registrado_en")).isNotNull();
        assertThat(revisados()).isEqualTo(revisadosAntes + 1);
        etapa(id, asesor2(), "ACUERDO").andExpect(status().isOk());
        assertThat(revisados()).isEqualTo(revisadosAntes);
        // El embudo tiene las nueve etapas en orden.
        JsonNode etapas = leerJson(get("/api/v1/interesados/embudo").header("Authorization", coordinador())).get("total")
                .get("etapas");
        List<String> orden = new ArrayList<>();
        etapas.forEach(e -> orden.add(e.get("etapa").asString()));
        assertThat(orden).containsExactly("NUEVO", "CONTACTADO", "REVISADO", "CITA_AGENDADA", "VISITA_REALIZADA",
                "ACUERDO", "SEPARACION", "VENTA", "DESCARTADO");
    }

    long revisados() throws Exception {
        for (JsonNode e : leerJson(get("/api/v1/interesados/embudo").header("Authorization", coordinador())).get("total")
                .get("etapas")) {
            if (e.get("etapa").asString().equals("REVISADO")) return e.get("cantidad").asLong();
        }
        throw new AssertionError("sin REVISADO");
    }

    // ------------------------------------------------------------------ RF41, RF42, RN29, RN30

    @Test
    @DisplayName("RF41 y RN29: separar marca el lote para todos; otro interesado no lo separa; el comprador no cambia estados")
    void separarUnaSolaVez() throws Exception {
        String clave = loteDisponible(0);
        long a = crear("Andrea", clave);
        long b = crear("Benito", clave);
        asignar(a, "asesor-02");
        asignar(b, "asesor-03");
        // RN30: el comprador no cambia la etapa ni libera (lo rechaza el servidor).
        etapa(a, comprador(), "SEPARACION").andExpect(status().isForbidden());
        liberar(a, comprador(), "no").andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/proyectos/" + VENTISCA + "/lotes/" + clave + "/estado-comercial")
                .header("Authorization", comprador()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"estadoComercial\":\"SEPARADO\"}")).andExpect(status().isForbidden());
        assertThat(estadoPublico(clave)).isEqualTo("DISPONIBLE");

        etapa(a, asesor2(), "SEPARACION").andExpect(status().isOk())
                .andExpect(jsonPath("$.separacion.estado").value("ACTIVA"))
                .andExpect(jsonPath("$.puedeLiberar").value(true));
        assertThat(estadoPublico(clave)).isEqualTo("SEPARADO");
        // RN29: el mismo lote no se separa para otro interesado, ni con la acción explícita.
        etapa(b, asesor3(), "SEPARACION").andExpect(status().isConflict());
        etapa(b, asesor3(), "VENTA").andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select etapa from interes where id = ?", String.class, b)).isEqualTo("NUEVO");
        assertThat(estadoPublico(clave)).isEqualTo("SEPARADO");
        // Salir de Separación solo liberando con motivo.
        etapa(a, asesor2(), "ACUERDO").andExpect(status().isUnprocessableContent());
        assertThat(jdbc.queryForObject("select count(*) from separacion_lote where interes_id = ? and estado = 'ACTIVA'",
                Integer.class, a)).isEqualTo(1);
    }

    @Test
    @DisplayName("RF42: liberar con motivo reactiva el lote para otro cliente; sin motivo, 400; queda fecha y motivo")
    void liberarReactiva() throws Exception {
        String clave = loteDisponible(1);
        long a = crear("Camila", clave);
        long b = crear("Daniel", clave);
        asignar(a, "asesor-02");
        asignar(b, "asesor-02");
        etapa(a, asesor2(), "SEPARACION").andExpect(status().isOk());
        json(post("/api/v1/interesados/" + a + "/liberacion"), asesor2(), "{\"motivo\":\"\"}").andExpect(status().isBadRequest());
        json(post("/api/v1/interesados/" + a + "/liberacion"), asesor2(), "{\"motivo\":\"No consiguió el crédito\",\"etapa\":\"VENTA\"}")
                .andExpect(status().isBadRequest());
        json(post("/api/v1/interesados/" + a + "/liberacion"), asesor2(), "{\"motivo\":\"No consiguió el crédito\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.interes.etapa").value("DESCARTADO"))
                .andExpect(jsonPath("$.descartes").value(1)).andExpect(jsonPath("$.separacion").isEmpty())
                .andExpect(jsonPath("$.historialEtapas[-1:].motivo", hasItem("No consiguió el crédito")));
        assertThat(estadoPublico(clave)).isEqualTo("DISPONIBLE");
        Map<String, Object> s = jdbc.queryForMap("select * from separacion_lote where interes_id = ?", a);
        assertThat(s.get("estado")).isEqualTo("LIBERADA");
        assertThat(s.get("motivo")).isEqualTo("No consiguió el crédito");
        assertThat(s.get("cerrada_en")).isNotNull();
        assertThat(s.get("cerrada_por")).isEqualTo("asesor-02");
        // Ahora el lote se puede separar para otro cliente.
        etapa(b, asesor2(), "SEPARACION").andExpect(status().isOk());
        assertThat(estadoPublico(clave)).isEqualTo("SEPARADO");
        // Sin separación vigente no hay nada que liberar.
        liberar(a, asesor2(), "otra vez").andExpect(status().isUnprocessableContent());
    }

    @Test
    @DisplayName("RN29: una venta con depósito no se retrotrae (ni por etapa ni liberando); una sin depósito sí se libera")
    void ventaConDeposito() throws Exception {
        String clave = loteDisponible(2);
        long a = crear("Esteban", clave);
        asignar(a, "asesor-02");
        etapa(a, asesor2(), "SEPARACION").andExpect(status().isOk());
        json(put("/api/v1/interesados/" + a + "/etapa"), asesor2(), "{\"etapa\":\"SEPARACION\",\"conDeposito\":true}")
                .andExpect(status().isBadRequest());
        json(put("/api/v1/interesados/" + a + "/etapa"), asesor2(), "{\"etapa\":\"VENTA\",\"conDeposito\":true}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.separacion.estado").value("VENDIDA"))
                .andExpect(jsonPath("$.separacion.conDeposito").value(true))
                .andExpect(jsonPath("$.puedeLiberar").value(false));
        assertThat(estadoPublico(clave)).isEqualTo("VENDIDO");
        etapa(a, asesor2(), "SEPARACION").andExpect(status().isUnprocessableContent());
        etapa(a, coordinador(), "DESCARTADO").andExpect(status().isUnprocessableContent());
        liberar(a, coordinador(), "Se arrepintió").andExpect(status().isUnprocessableContent());
        assertThat(estadoPublico(clave)).isEqualTo("VENDIDO");

        // Una venta sin depósito (directa, sin separar antes) sí se libera con motivo.
        String otra = loteDisponible(0);
        long b = crear("Fabiola", otra);
        asignar(b, "asesor-02");
        etapa(b, asesor2(), "VENTA").andExpect(status().isOk()).andExpect(jsonPath("$.separacion.conDeposito").value(false));
        assertThat(estadoPublico(otra)).isEqualTo("VENDIDO");
        liberar(b, asesor2(), "La minuta no se firmó").andExpect(status().isOk());
        assertThat(estadoPublico(otra)).isEqualTo("DISPONIBLE");
    }

    @Test
    @DisplayName("RN31: tras dos liberaciones del mismo interesado, solo un coordinador libera otra; todas quedan registradas")
    void topeDeDescartes() throws Exception {
        String clave = loteDisponible(3);
        long a = crear("Gonzalo", clave);
        asignar(a, "asesor-02");
        for (int n = 1; n <= 2; n++) {
            etapa(a, asesor2(), "SEPARACION").andExpect(status().isOk());
            liberar(a, asesor2(), "Descarte número " + n).andExpect(status().isOk())
                    .andExpect(jsonPath("$.descartes").value(n));
        }
        etapa(a, asesor2(), "SEPARACION").andExpect(status().isOk());
        liberar(a, asesor2(), "Tercer descarte").andExpect(status().isForbidden());
        assertThat(estadoPublico(clave)).isEqualTo("SEPARADO");
        liberar(a, coordinador(), "Tercer descarte, autorizado").andExpect(status().isOk())
                .andExpect(jsonPath("$.descartes").value(3));
        assertThat(estadoPublico(clave)).isEqualTo("DISPONIBLE");
        assertThat(jdbc.queryForObject("select count(*) from separacion_lote where interes_id = ? and estado = 'LIBERADA' "
                + "and motivo is not null and cerrada_en is not null", Integer.class, a)).isEqualTo(3);
        // Un interesado con el lote separado no se elimina sin liberarlo antes.
        etapa(a, asesor2(), "SEPARACION").andExpect(status().isOk());
        mvc.perform(delete("/api/v1/interesados/" + a).header("Authorization", coordinador()))
                .andExpect(status().isUnprocessableContent());
    }

    // ------------------------------------------------------------------ RF37

    @Test
    @DisplayName("RF37: con una cita para hoy el asesor recibe la alerta; sin citas próximas, no")
    void alertaDelDia() throws Exception {
        String a3 = asesor3();
        long id = crear("Hilda", null);
        asignar(id, "asesor-03");
        json(post("/api/v1/interesados/" + id + "/citas"), a3, "{\"tipo\":\"LLAMADA\",\"fecha\":\"" + HOY
                + "\",\"franja\":\"TARDE\"}").andExpect(status().isCreated());
        json(put("/api/v1/interesados/" + id + "/seguimiento"), a3, "{\"responsable\":\"asesor-03\",\"proximaAccion\":"
                + "\"Llamar para confirmar\",\"proximaAccionFecha\":\"" + HOY + "\"}").andExpect(status().isOk());
        JsonNode dia = leerJson(get("/api/v1/interesados/mi-dia").header("Authorization", a3));
        assertThat(dia.get("alerta").asBoolean()).isTrue();
        assertThat(dia.get("hoyCitas").toString()).contains("\"interesId\":" + id, "LLAMADA");
        assertThat(dia.get("seguimientosPendientes").asLong()).isGreaterThanOrEqualTo(1);
        // Es de asesor-03: el otro asesor no la ve en su día.
        assertThat(leerJson(get("/api/v1/interesados/mi-dia").header("Authorization", asesor2())).toString())
                .doesNotContain("\"interesId\":" + id + ",");
        // Solo el equipo.
        mvc.perform(get("/api/v1/interesados/mi-dia").header("Authorization", comprador())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/interesados/mi-dia")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("RF37: un asesor sin citas ni llamadas para hoy o mañana no recibe la alerta")
    void sinAlerta() throws Exception {
        JsonNode dia = leerJson(get("/api/v1/interesados/mi-dia").header("Authorization", token("asesor-04")));
        assertThat(dia.get("cuenta").asString()).isEqualTo("asesor-04");
        assertThat(dia.get("alerta").asBoolean()).isFalse();
        assertThat(dia.get("hoyCitas")).isEmpty();
        assertThat(dia.get("proximas")).isEmpty();
        assertThat(dia.get("seguimientosPendientes").asLong()).isZero();
        // Una cita para dentro de una semana no es inminente: sigue sin alerta.
        long id = crear("Ignacio", null);
        asignar(id, "asesor-04");
        json(post("/api/v1/interesados/" + id + "/citas"), token("asesor-04"), "{\"tipo\":\"REUNION_EN_OFICINA\",\"fecha\":\""
                + HOY.plusDays(7) + "\",\"franja\":\"MANANA\"}").andExpect(status().isCreated());
        assertThat(leerJson(get("/api/v1/interesados/mi-dia").header("Authorization", token("asesor-04"))).get("alerta")
                .asBoolean()).isFalse();
    }
}
