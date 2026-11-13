package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
 * v1.0 (etapa 4): interés, citas y bandeja de interesados. Base H2 propia porque crea, cambia y elimina interesados y
 * marca lotes como separados o vendidos.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:interes-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class InteresApiTest extends BaseApiTest {
    static final String VERSION = "2026-11-v1";
    static final String VENTISCA = "altos-de-ventisca";
    static final LocalDate HOY = LocalDate.now(ZoneId.of("America/Lima"));
    /** Cada prueba envía desde su propia IP para no gastar el límite por hora de otra. */
    static final AtomicInteger IP = new AtomicInteger(10);

    static String ipNueva() {
        return "10.0.0." + IP.incrementAndGet();
    }

    ObjectNode base() {
        ObjectNode c = json.createObjectNode();
        c.put("nombre", "Valeria");
        c.put("medio", "CORREO");
        c.put("contacto", "valeria.prueba@example.com");
        c.put("consentimiento", true);
        c.put("consentimientoVersion", VERSION);
        return c;
    }

    ResultActions enviar(ObjectNode cuerpo, String ip) throws Exception {
        return mvc.perform(post("/api/v1/publico/interes").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(cuerpo)).with(r -> {
                    r.setRemoteAddr(ip);
                    return r;
                }));
    }

    JsonNode leerJson(MockHttpServletRequestBuilder req) throws Exception {
        return json.readTree(mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    String asesor() throws Exception {
        return token("asesor-01");
    }

    int intereses() {
        return jdbc.queryForObject("select count(*) from interes", Integer.class);
    }

    /** Un lote del plano que se ofrece, disponible y sin caso propio. */
    String loteDisponible(int n) throws Exception {
        JsonNode p = leerJson(get("/api/v1/publico/proyectos/" + VENTISCA));
        List<String> claves = new ArrayList<>();
        for (JsonNode l : p.get("lotes")) {
            if (l.get("publicado").asBoolean() && l.get("casoCodigo").isNull()
                    && l.get("estadoComercial").asString().equals("DISPONIBLE")) claves.add(l.get("clave").asString());
        }
        return claves.get(claves.size() - 1 - n);
    }

    String casoPublicado() {
        return jdbc.queryForObject("select codigo from caso_lote where estado_publicacion = 'PUBLICADO' order by codigo "
                + "limit 1", String.class);
    }

    /** Crea un interesado sobre un lote y devuelve su id. */
    long crearSobreLote(String clave, String nombre) throws Exception {
        ObjectNode c = base();
        c.put("nombre", nombre);
        c.put("proyectoCodigo", VENTISCA);
        c.put("lote", clave);
        enviar(c, ipNueva()).andExpect(status().isCreated());
        return jdbc.queryForObject("select max(id) from interes", Long.class);
    }

    long citaDe(long interesId) {
        return jdbc.queryForObject("select id from cita where interes_id = ?", Long.class, interesId);
    }

    // ------------------------------------------------------------------ portal público

    @Test
    @DisplayName("sin sesión: configuración pública con el consentimiento vigente; sin variable, el WhatsApp de empresa.json")
    void configuracionPublica() throws Exception {
        // v1.0 (etapa 8): con APP_CONTACTO_WHATSAPP vacía ya no queda sin número: toma el de la inmobiliaria.
        mvc.perform(get("/api/v1/publico/contacto")).andExpect(status().isOk())
                .andExpect(jsonPath("$.whatsapp").value("51991108224"))
                .andExpect(jsonPath("$.consentimientoVersion").value(VERSION))
                .andExpect(jsonPath("$.consentimientoTexto").value(containsString("eliminen")));
    }

    @Test
    @DisplayName("un lote de proyecto sin caso propio recibe interés y cita, vinculados al lote y a su proyecto")
    void interesConCitaSobreLote() throws Exception {
        String clave = loteDisponible(0);
        ObjectNode c = base();
        c.put("proyectoCodigo", VENTISCA);
        c.put("lote", clave);
        c.put("formaPago", "FINANCIADO");
        c.put("mensaje", "¿Se puede visitar un sábado?");
        ObjectNode cita = c.putObject("cita");
        cita.put("modalidad", "VISITA_AL_LOTE");
        var ops = cita.putArray("opciones");
        ops.addObject().put("fecha", HOY.plusDays(2).toString()).put("franja", "MANANA");
        ops.addObject().put("fecha", HOY.plusDays(3).toString()).put("franja", "TARDE");
        int antes = intereses();
        enviar(c, ipNueva()).andExpect(status().isCreated()).andExpect(jsonPath("$.recibido").value(true))
                .andExpect(jsonPath("$.conCita").value(true));
        assertThat(intereses()).isEqualTo(antes + 1);
        var fila = jdbc.queryForMap("select * from interes where id = (select max(id) from interes)");
        assertThat(fila.get("origen")).isEqualTo("LOTE");
        assertThat(fila.get("proyecto_codigo")).isEqualTo(VENTISCA);
        assertThat(fila.get("lote_clave")).isEqualTo(clave);
        assertThat(fila.get("caso_codigo")).isNull();
        assertThat(fila.get("referencia")).isEqualTo(VENTISCA + "-" + clave);
        assertThat(fila.get("zona")).isEqualTo("Subtanjalla");
        assertThat(fila.get("tipo")).isEqualTo("LOTE");
        assertThat(fila.get("etapa")).isEqualTo("NUEVO");
        assertThat(fila.get("consentimiento_version")).isEqualTo(VERSION);
        var c1 = jdbc.queryForMap("select * from cita where interes_id = ?", fila.get("id"));
        assertThat(c1.get("estado")).isEqualTo("SOLICITADA");
        assertThat(c1.get("modalidad")).isEqualTo("VISITA_AL_LOTE");
        assertThat(c1.get("fecha2")).isNotNull();
    }

    @Test
    @DisplayName("interés sobre un caso publicado y búsqueda general; un borrador o un lote inexistente dan 404")
    void destinos() throws Exception {
        ObjectNode c = base();
        c.put("casoCodigo", casoPublicado());
        enviar(c, ipNueva()).andExpect(status().isCreated()).andExpect(jsonPath("$.conCita").value(false));
        assertThat(jdbc.queryForObject("select origen from interes where id = (select max(id) from interes)",
                String.class)).isEqualTo("CASO");

        ObjectNode g = base();
        g.put("zona", "Parcona");
        g.put("tipo", "lote");
        g.put("presupuestoMin", 20000);
        g.put("presupuestoMax", "35000");
        g.put("areaDeseada", "120,5");
        enviar(g, ipNueva()).andExpect(status().isCreated());
        var fila = jdbc.queryForMap("select * from interes where id = (select max(id) from interes)");
        assertThat(fila.get("origen")).isEqualTo("GENERAL");
        assertThat(fila.get("moneda")).isEqualTo("PEN");
        assertThat(fila.get("tipo")).isEqualTo("LOTE");

        int antes = intereses();
        ObjectNode b = base();
        b.put("casoCodigo", MATRIZ_VENTISCA);
        enviar(b, ipNueva()).andExpect(status().isNotFound());
        ObjectNode l = base();
        l.put("proyectoCodigo", VENTISCA);
        l.put("lote", "Z-999");
        enviar(l, ipNueva()).andExpect(status().isNotFound());
        ObjectNode v = base();
        v.putObject("cita").put("modalidad", "VISITA_AL_LOTE").putArray("opciones").addObject()
                .put("fecha", HOY.plusDays(1).toString()).put("franja", "TARDE");
        enviar(v, ipNueva()).andExpect(status().isBadRequest());
        assertThat(intereses()).isEqualTo(antes);
    }

    @Test
    @DisplayName("el consentimiento es obligatorio y con la versión vigente del texto")
    void consentimiento() throws Exception {
        int antes = intereses();
        ObjectNode sin = base();
        sin.remove("consentimiento");
        enviar(sin, ipNueva()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("consentimiento")));
        ObjectNode falso = base();
        falso.put("consentimiento", false);
        enviar(falso, ipNueva()).andExpect(status().isBadRequest());
        ObjectNode texto = base();
        texto.put("consentimiento", "sí");
        enviar(texto, ipNueva()).andExpect(status().isBadRequest());
        ObjectNode vieja = base();
        vieja.put("consentimientoVersion", "2025-01-v0");
        enviar(vieja, ipNueva()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("consentimientoVersion")));
        assertThat(intereses()).isEqualTo(antes);
    }

    @Test
    @DisplayName("nunca DNI: un campo desconocido o un número de 8 dígitos en el mensaje dan 400")
    void nuncaDni() throws Exception {
        int antes = intereses();
        ObjectNode dni = base();
        dni.put("dni", "00000000");
        enviar(dni, ipNueva()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("no está permitido")));
        ObjectNode mensaje = base();
        mensaje.put("mensaje", "Mi documento es 12345678, gracias");
        enviar(mensaje, ipNueva()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("DNI")));
        assertThat(intereses()).isEqualTo(antes);
    }

    @Test
    @DisplayName("validaciones de nombre, contacto, presupuesto, área, mensaje y cita")
    void validaciones() throws Exception {
        int antes = intereses();
        List<java.util.function.Consumer<ObjectNode>> malos = List.of(
                c -> c.remove("nombre"),
                c -> c.put("nombre", "Ana 2"),
                c -> c.put("nombre", "A"),
                c -> c.put("medio", "FAX"),
                c -> c.put("contacto", "sin-arroba"),
                c -> c.put("medio", "CELULAR").put("contacto", "12345"),
                c -> c.put("medio", "CELULAR").put("contacto", "812345678"),
                c -> c.put("presupuestoMin", 50000).put("presupuestoMax", 40000),
                c -> c.put("presupuestoMin", -1),
                c -> c.put("presupuestoMax", "mucho"),
                c -> c.put("moneda", "EUR"),
                c -> c.put("areaDeseada", 0),
                c -> c.put("tipo", "OFICINA"),
                c -> c.put("formaPago", "TARJETA"),
                c -> c.put("mensaje", "x".repeat(301)),
                c -> c.putObject("cita").put("modalidad", "LLAMADA"),
                c -> c.putObject("cita").put("modalidad", "CENA").putArray("opciones").addObject()
                        .put("fecha", HOY.plusDays(1).toString()).put("franja", "TARDE"),
                c -> c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones").addObject()
                        .put("fecha", HOY.minusDays(1).toString()).put("franja", "TARDE"),
                c -> c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones").addObject()
                        .put("fecha", HOY.toString()).put("franja", "TARDE"),
                c -> c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones").addObject()
                        .put("fecha", HOY.plusDays(91).toString()).put("franja", "TARDE"),
                c -> c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones").addObject()
                        .put("fecha", HOY.plusDays(2).toString()).put("franja", "NOCHE"),
                c -> {
                    var ops = c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones");
                    ops.addObject().put("fecha", HOY.plusDays(2).toString()).put("franja", "TARDE");
                    ops.addObject().put("fecha", HOY.plusDays(2).toString()).put("franja", "TARDE");
                },
                c -> {
                    var ops = c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones");
                    for (int d = 1; d <= 3; d++) ops.addObject().put("fecha", HOY.plusDays(d).toString()).put("franja", "TARDE");
                });
        for (var malo : malos) {
            ObjectNode c = base();
            malo.accept(c);
            enviar(c, ipNueva()).andExpect(status().isBadRequest());
        }
        assertThat(intereses()).isEqualTo(antes);

        ObjectNode celular = base();
        celular.put("medio", "CELULAR");
        celular.put("contacto", "+51 900 000 000");
        enviar(celular, ipNueva()).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select contacto from interes where id = (select max(id) from interes)",
                String.class)).isEqualTo("900000000");
    }

    @Test
    @DisplayName("campo trampa: se responde igual, pero no se guarda nada")
    void trampa() throws Exception {
        int antes = intereses();
        int citas = jdbc.queryForObject("select count(*) from cita", Integer.class);
        ObjectNode c = base();
        c.put("sitioWeb", "https://robot.example.com");
        c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones").addObject()
                .put("fecha", HOY.plusDays(1).toString()).put("franja", "TARDE");
        enviar(c, ipNueva()).andExpect(status().isCreated()).andExpect(jsonPath("$.recibido").value(true));
        assertThat(intereses()).isEqualTo(antes);
        assertThat(jdbc.queryForObject("select count(*) from cita", Integer.class)).isEqualTo(citas);
    }

    @Test
    @DisplayName("límite de 10 envíos por hora por IP: el 11.º da 429 y otra IP sigue pudiendo")
    void limitePorIp() throws Exception {
        String ip = ipNueva();
        for (int n = 0; n < 10; n++) enviar(base(), ip).andExpect(status().isCreated());
        int antes = intereses();
        enviar(base(), ip).andExpect(status().isTooManyRequests());
        assertThat(intereses()).isEqualTo(antes);
        enviar(base(), ipNueva()).andExpect(status().isCreated());
    }

    // ------------------------------------------------------------------ permisos

    @Test
    @DisplayName("la bandeja, las notas y la agenda son solo del asesor y del gestor")
    void permisos() throws Exception {
        String[] rutas = {"/api/v1/interesados", "/api/v1/interesados/resumen", "/api/v1/citas/agenda"};
        for (String r : rutas) {
            mvc.perform(get(r)).andExpect(status().isUnauthorized());
            for (String cuenta : new String[] {"comprador-01", "revisor-01", "especialista-01", "propietario-01"}) {
                mvc.perform(get(r).header("Authorization", token(cuenta))).andExpect(status().isForbidden());
            }
            mvc.perform(get(r).header("Authorization", asesor())).andExpect(status().isOk());
            mvc.perform(get(r).header("Authorization", gestor())).andExpect(status().isOk());
        }
        long id = jdbc.queryForObject("select min(id) from interes", Long.class);
        mvc.perform(post("/api/v1/interesados/" + id + "/notas").contentType(MediaType.APPLICATION_JSON)
                .content("{\"texto\":\"hola\"}")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", comprador())
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"VENTA\"}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/interesados/" + id).header("Authorization", revisor()))
                .andExpect(status().isForbidden());
        // Sin sesión solo se puede enviar el interés: otras escrituras públicas siguen dando 401.
        mvc.perform(post("/api/v1/publico/inmuebles")).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ precarga

    @Test
    @DisplayName("precarga: 15 interesados en todas las etapas, correos @example.com y 4 citas en los próximos 7 días")
    void precarga() throws Exception {
        JsonNode lista = leerJson(get("/api/v1/interesados").header("Authorization", asesor()));
        // La precarga corre al arrancar, antes que cualquier prueba: son los 15 primeros registros.
        List<java.util.Map<String, Object>> semilla = jdbc.queryForList("select * from interes where id <= 15");
        assertThat(semilla).hasSize(15);
        Set<String> etapas = new HashSet<>();
        for (var i : semilla) etapas.add((String) i.get("etapa"));
        assertThat(etapas).containsExactlyInAnyOrder("NUEVO", "CONTACTADO", "CITA_AGENDADA", "VISITA_REALIZADA",
                "SEPARACION", "VENTA", "DESCARTADO");
        // Nunca DNI ni celulares en la precarga: solo nombres de pila y correos @example.com, con consentimiento.
        assertThat(semilla).allSatisfy(i -> {
            assertThat(i.get("medio")).isEqualTo("CORREO");
            assertThat((String) i.get("contacto")).matches("^[a-z]+\\.[a-z]+@example\\.com$");
            assertThat((String) i.get("nombre")).matches("^\\p{L}+$");
            assertThat(i.get("consentimiento_version")).isEqualTo(VERSION);
        });
        assertThat(jdbc.queryForObject("select count(*) from nota_interes", Integer.class)).isGreaterThanOrEqualTo(10);
        // Las 4 citas precargadas caen en los próximos 7 días (acordadas, o propuestas si están por confirmar).
        List<LocalDate> fechas = jdbc.queryForList("select coalesce(fecha_acordada, fecha1) from cita where interes_id <= 15",
                LocalDate.class);
        assertThat(fechas).hasSize(4).allSatisfy(f -> assertThat(f).isAfterOrEqualTo(HOY).isBefore(HOY.plusDays(8)));
        // Hay vencidos y aparecen primero en la bandeja.
        assertThat(lista.get(0).get("vencido").asBoolean()).isTrue();
        JsonNode agenda = leerJson(get("/api/v1/citas/agenda").header("Authorization", asesor()));
        assertThat(agenda.get("dias")).hasSize(7);
        int enAgenda = 0;
        for (JsonNode d : agenda.get("dias")) enAgenda += d.get("citas").size();
        assertThat(enAgenda).isGreaterThanOrEqualTo(4);
    }

    // ------------------------------------------------------------------ bandeja

    @Test
    @DisplayName("filtros de la bandeja por etapa, proyecto, responsable y vencidos")
    void filtros() throws Exception {
        String a = asesor();
        JsonNode todos = leerJson(get("/api/v1/interesados").header("Authorization", a));
        JsonNode nuevos = leerJson(get("/api/v1/interesados").param("etapa", "NUEVO").header("Authorization", a));
        assertThat(nuevos).isNotEmpty().allSatisfy(i -> assertThat(i.get("etapa").asString()).isEqualTo("NUEVO"));
        JsonNode proyecto = leerJson(get("/api/v1/interesados").param("proyecto", VENTISCA).header("Authorization", a));
        assertThat(proyecto).isNotEmpty()
                .allSatisfy(i -> assertThat(i.get("proyectoCodigo").asString()).isEqualTo(VENTISCA));
        JsonNode gestor = leerJson(get("/api/v1/interesados").param("responsable", "gestor-01").header("Authorization", a));
        assertThat(gestor).isNotEmpty()
                .allSatisfy(i -> assertThat(i.get("responsable").asString()).isEqualTo("gestor-01"));
        JsonNode sin = leerJson(get("/api/v1/interesados").param("responsable", "SIN_ASIGNAR").header("Authorization", a));
        assertThat(sin).allSatisfy(i -> assertThat(i.get("responsable").isNull()).isTrue());
        JsonNode vencidos = leerJson(get("/api/v1/interesados").param("vencidos", "true").header("Authorization", a));
        assertThat(vencidos).isNotEmpty().allSatisfy(i -> assertThat(i.get("vencido").asBoolean()).isTrue());
        assertThat(todos.size()).isGreaterThan(vencidos.size());
        mvc.perform(get("/api/v1/interesados").param("etapa", "PERDIDO").header("Authorization", a))
                .andExpect(status().isBadRequest());
        JsonNode resumen = leerJson(get("/api/v1/interesados/resumen").header("Authorization", a));
        long descartados = resumen.get("porEtapa").get("DESCARTADO").asLong();
        assertThat(resumen.get("activos").asLong()).isEqualTo(todos.size() - descartados);
        assertThat(resumen.get("porZona")).isNotEmpty();
        assertThat(resumen.get("porTipo")).isNotEmpty();
        assertThat(resumen.get("porPresupuesto")).isNotEmpty();
        JsonNode opciones = leerJson(get("/api/v1/interesados/opciones").header("Authorization", a));
        assertThat(opciones.get("responsables").toString()).contains("asesor-01", "gestor-01");
    }

    @Test
    @DisplayName("etapas: cambiar deja una nota; la misma etapa da 409 y una inválida 400")
    void etapas() throws Exception {
        long id = crearSobreLote(loteDisponible(1), "Teresa");
        String a = asesor();
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"CONTACTADO\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interes.etapa").value("CONTACTADO"))
                .andExpect(jsonPath("$.notas[0].texto").value("Etapa: Nuevo → Contactado."))
                .andExpect(jsonPath("$.notas[0].cuentaCodigo").value("asesor-01"));
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"CONTACTADO\"}"))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"GANADO\"}"))
                .andExpect(status().isBadRequest());
        // Seguimiento: responsable de otro rol o fecha sin acción, 400; con acción vencida, sale como vencido.
        mvc.perform(put("/api/v1/interesados/" + id + "/seguimiento").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"responsable\":\"comprador-01\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/interesados/" + id + "/seguimiento").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"proximaAccionFecha\":\"" + HOY + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/interesados/" + id + "/seguimiento").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"responsable\":\"gestor-01\",\"proximaAccion\":"
                        + "\"Llamar\",\"proximaAccionFecha\":\"" + HOY.minusDays(1) + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interes.vencido").value(true))
                .andExpect(jsonPath("$.interes.responsable").value("gestor-01"));
        // Cerrado (venta o descarte) ya no tiene acciones vencidas.
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"DESCARTADO\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.interes.vencido").value(false));
    }

    @Test
    @DisplayName("notas: solo se agregan; vacías o demasiado largas dan 400")
    void notas() throws Exception {
        long id = crearSobreLote(loteDisponible(2), "Rocío");
        String g = gestor();
        mvc.perform(post("/api/v1/interesados/" + id + "/notas").header("Authorization", g)
                .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"Prefiere que le escriban en la tarde.\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.cuentaCodigo").value("gestor-01"));
        for (String malo : new String[] {"{\"texto\":\"  \"}", "{\"texto\":\"" + "x".repeat(1001) + "\"}",
                "{\"texto\":\"ok\",\"autor\":\"otro\"}"}) {
            mvc.perform(post("/api/v1/interesados/" + id + "/notas").header("Authorization", g)
                    .contentType(MediaType.APPLICATION_JSON).content(malo)).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/v1/interesados/" + id).header("Authorization", g)).andExpect(status().isOk())
                .andExpect(jsonPath("$.notas", hasSize(1))).andExpect(jsonPath("$.interes.notas").value(1));
        long nota = jdbc.queryForObject("select id from nota_interes where interes_id = ?", Long.class, id);
        // No hay forma de editar ni borrar una nota.
        mvc.perform(delete("/api/v1/interesados/" + id + "/notas/" + nota).header("Authorization", g))
                .andExpect(status().is4xxClientError());
        mvc.perform(put("/api/v1/interesados/" + id + "/notas/" + nota).header("Authorization", g)
                .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"otro\"}"))
                .andExpect(status().is4xxClientError());
        assertThat(jdbc.queryForObject("select texto from nota_interes where id = ?", String.class, nota))
                .isEqualTo("Prefiere que le escriban en la tarde.");
    }

    @Test
    @DisplayName("citas: confirmar, reprogramar y rechazar con motivo; la agenda muestra la cita en su día")
    void citas() throws Exception {
        String a = asesor();
        String clave = loteDisponible(3);
        ObjectNode c = base();
        c.put("nombre", "Gloria");
        c.put("proyectoCodigo", VENTISCA);
        c.put("lote", clave);
        var ops = c.putObject("cita").put("modalidad", "REUNION_EN_OFICINA").putArray("opciones");
        ops.addObject().put("fecha", HOY.plusDays(3).toString()).put("franja", "MANANA");
        ops.addObject().put("fecha", HOY.plusDays(5).toString()).put("franja", "TARDE");
        enviar(c, ipNueva()).andExpect(status().isCreated());
        long id = jdbc.queryForObject("select max(id) from interes", Long.class);
        long cita = citaDe(id);

        mvc.perform(get("/api/v1/interesados/" + id).header("Authorization", a))
                .andExpect(jsonPath("$.interes.citaPorConfirmar").value(true))
                .andExpect(jsonPath("$.citas[0].opciones", hasSize(2)));
        mvc.perform(put("/api/v1/citas/" + cita + "/confirmacion").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"opcion\":3}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/citas/" + cita + "/confirmacion").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"opcion\":2}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CONFIRMADA"))
                .andExpect(jsonPath("$.fechaAcordada").value(HOY.plusDays(5).toString()))
                .andExpect(jsonPath("$.franjaAcordada").value("TARDE"));
        mvc.perform(get("/api/v1/interesados/" + id).header("Authorization", a))
                .andExpect(jsonPath("$.interes.etapa").value("CITA_AGENDADA"))
                .andExpect(jsonPath("$.interes.citaPorConfirmar").value(false));
        mvc.perform(put("/api/v1/citas/" + cita + "/confirmacion").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"opcion\":1}")).andExpect(status().isConflict());

        JsonNode agenda = leerJson(get("/api/v1/citas/agenda").header("Authorization", a));
        JsonNode dia = agenda.get("dias").get(5);
        assertThat(dia.get("fecha").asString()).isEqualTo(HOY.plusDays(5).toString());
        assertThat(dia.get("citas").toString()).contains("Gloria");

        mvc.perform(put("/api/v1/citas/" + cita + "/reprogramacion").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"fecha\":\"" + HOY.minusDays(1)
                        + "\",\"franja\":\"MANANA\"}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/citas/" + cita + "/reprogramacion").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"fecha\":\"" + HOY.plusDays(10)
                        + "\",\"franja\":\"MANANA\"}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("REPROGRAMADA"))
                .andExpect(jsonPath("$.fechaAcordada").value(HOY.plusDays(10).toString()));
        JsonNode siguiente = leerJson(get("/api/v1/citas/agenda").param("desde", HOY.plusDays(7).toString())
                .header("Authorization", a));
        assertThat(siguiente.get("dias").get(3).get("citas").toString()).contains("Gloria");

        mvc.perform(put("/api/v1/citas/" + cita + "/rechazo").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/citas/" + cita + "/rechazo").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"El interesado ya no puede asistir\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("RECHAZADA"))
                .andExpect(jsonPath("$.motivoRechazo").value("El interesado ya no puede asistir"))
                .andExpect(jsonPath("$.fechaAcordada").value(nullValue()));
        mvc.perform(put("/api/v1/citas/" + cita + "/rechazo").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"otra vez\"}"))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/v1/citas/999999/confirmacion").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"opcion\":1}")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("en Separación o Venta se marca el lote como separado o vendido; el indicador A no cambia")
    void marcarLote() throws Exception {
        String a = asesor();
        String clave = loteDisponible(4);
        long id = crearSobreLote(clave, "Martín");
        String antesA = leerJson(get("/api/v1/publico/proyectos/" + VENTISCA)).get("indicadorA").toString();
        mvc.perform(put("/api/v1/interesados/" + id + "/estado-lote").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"SEPARADO\"}"))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"SEPARACION\"}"))
                .andExpect(jsonPath("$.puedeMarcarLote").value(true));
        mvc.perform(put("/api/v1/interesados/" + id + "/estado-lote").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"DISPONIBLE\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/interesados/" + id + "/estado-lote").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"SEPARADO\"}"))
                .andExpect(status().isOk());
        JsonNode lote = leerJson(get("/api/v1/publico/proyectos/" + VENTISCA + "/lotes/" + clave));
        assertThat(lote.get("lote").get("estadoComercial").asString()).isEqualTo("SEPARADO");
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"VENTA\"}"));
        mvc.perform(put("/api/v1/interesados/" + id + "/estado-lote").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"VENDIDO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notas[*].texto", hasItem(containsString("como vendido"))));
        assertThat(leerJson(get("/api/v1/publico/proyectos/" + VENTISCA + "/lotes/" + clave)).get("lote")
                .get("estadoComercial").asString()).isEqualTo("VENDIDO");
        assertThat(leerJson(get("/api/v1/publico/proyectos/" + VENTISCA)).get("indicadorA").toString()).isEqualTo(antesA);
        // Una búsqueda general no tiene lote que marcar.
        enviar(base(), ipNueva()).andExpect(status().isCreated());
        long general = jdbc.queryForObject("select max(id) from interes", Long.class);
        mvc.perform(put("/api/v1/interesados/" + general + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"SEPARACION\"}"))
                .andExpect(jsonPath("$.puedeMarcarLote").value(false));
        mvc.perform(put("/api/v1/interesados/" + general + "/estado-lote").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"SEPARADO\"}"))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    @DisplayName("eliminar a pedido borra el registro con sus notas y citas")
    void eliminar() throws Exception {
        ObjectNode c = base();
        c.put("nombre", "Hugo");
        c.putObject("cita").put("modalidad", "LLAMADA").putArray("opciones").addObject()
                .put("fecha", HOY.plusDays(1).toString()).put("franja", "MANANA");
        enviar(c, ipNueva()).andExpect(status().isCreated());
        long id = jdbc.queryForObject("select max(id) from interes", Long.class);
        String a = asesor();
        mvc.perform(post("/api/v1/interesados/" + id + "/notas").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"Pidió que se borren sus datos.\"}"))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/interesados/" + id).header("Authorization", a)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/interesados/" + id).header("Authorization", a)).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("select count(*) from nota_interes where interes_id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from cita where interes_id = ?", Integer.class, id)).isZero();
        mvc.perform(delete("/api/v1/interesados/" + id).header("Authorization", a)).andExpect(status().isNotFound());
    }
}
