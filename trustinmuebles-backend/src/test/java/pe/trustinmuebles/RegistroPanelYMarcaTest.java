package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import pe.trustinmuebles.shared.Empresa;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v1.0 (etapa 8): registro de interesados desde el panel (consentimiento verbal, sin límite por IP), cifras reales de la
 * portada y marca de la inmobiliaria (empresa.json, PDF y WhatsApp). Base H2 propia porque crea interesados.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:registro-panel-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class RegistroPanelYMarcaTest extends BaseApiTest {
    static final String VENTISCA = "altos-de-ventisca";

    ObjectNode registro(String nombre, String correo) {
        ObjectNode c = json.createObjectNode();
        c.put("canal", "LLAMADA");
        c.put("consentimientoVerbal", true);
        c.put("nombre", nombre);
        c.put("medio", "CORREO");
        c.put("contacto", correo);
        return c;
    }

    ResultActions registrar(ObjectNode cuerpo, String autorizacion) throws Exception {
        var req = post("/api/v1/interesados").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo));
        if (autorizacion != null) req = req.header("Authorization", autorizacion);
        return mvc.perform(req);
    }

    int intereses() {
        return jdbc.queryForObject("select count(*) from interes", Integer.class);
    }

    // ------------------------------------------------------------------ registro desde el panel

    @Test
    @DisplayName("Panel: solo el asesor y el gestor registran interesados; sin sesión 401 y las demás cuentas 403")
    void permisos() throws Exception {
        int antes = intereses();
        registrar(registro("Rocío", "rocio.permisos@example.com"), null).andExpect(status().isUnauthorized());
        for (String cuenta : new String[] {"comprador-01", "revisor-01", "especialista-01", "propietario-01"}) {
            registrar(registro("Rocío", "rocio.permisos@example.com"), token(cuenta)).andExpect(status().isForbidden());
        }
        assertThat(intereses()).isEqualTo(antes);
        registrar(registro("Rocío", "rocio.asesor@example.com"), token("asesor-01")).andExpect(status().isCreated());
        registrar(registro("Rocío", "rocio.gestor@example.com"), gestor()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.interes.responsable").value("gestor-01"))
                .andExpect(jsonPath("$.consentimientoRegistradoPor").value("gestor-01"));
        assertThat(intereses()).isEqualTo(antes + 2);
    }

    @Test
    @DisplayName("Panel: guarda el canal, el consentimiento verbal con autor y fecha, el responsable y una nota")
    void registraConConsentimientoVerbal() throws Exception {
        ObjectNode c = registro("Teresa", "teresa.oficina@example.com");
        c.put("canal", "OFICINA");
        c.put("proyectoCodigo", VENTISCA);
        c.put("presupuestoMax", 90000);
        c.put("mensaje", "Busca un lote en esquina");
        JsonNode r = json.readTree(registrar(c, token("asesor-01")).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        assertThat(r.get("interes").get("canal").asString()).isEqualTo("OFICINA");
        assertThat(r.get("interes").get("canalEtiqueta").asString()).isEqualTo("Oficina");
        assertThat(r.get("interes").get("origen").asString()).isEqualTo("PROYECTO");
        assertThat(r.get("interes").get("etapa").asString()).isEqualTo("NUEVO");
        assertThat(r.get("interes").get("responsable").asString()).isEqualTo("asesor-01");
        assertThat(r.get("consentimientoForma").asString()).isEqualTo("VERBAL");
        assertThat(r.get("consentimientoFormaEtiqueta").asString()).containsIgnoringCase("verbal");
        assertThat(r.get("consentimientoRegistradoPor").asString()).isEqualTo("asesor-01");
        assertThat(r.get("consentimientoEn").isNull()).isFalse();
        assertThat(r.get("consentimientoVersion").asString()).isEqualTo("2026-11-v1");
        assertThat(r.get("notas").get(0).get("texto").asString()).contains("Oficina", "verbal", "asesor-01");
        long id = r.get("interes").get("id").asLong();
        assertThat(jdbc.queryForObject("select canal || '|' || consentimiento_forma || '|' || consentimiento_registrado_por "
                + "from interes where id = ?", String.class, id)).isEqualTo("OFICINA|VERBAL|asesor-01");
        // En la bandeja se ve el canal.
        mvc.perform(get("/api/v1/interesados").header("Authorization", token("asesor-01"))).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")].canalEtiqueta", contains("Oficina")));
    }

    @Test
    @DisplayName("Panel: las mismas validaciones del formulario, canal obligatorio y consentimiento verbal confirmado")
    void validaciones() throws Exception {
        String asesor = token("asesor-01");
        int antes = intereses();
        ObjectNode sinCanal = registro("Ana", "ana.v@example.com");
        sinCanal.remove("canal");
        registrar(sinCanal, asesor).andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail", containsString("canal")));
        ObjectNode web = registro("Ana", "ana.v@example.com");
        web.put("canal", "WEB");
        registrar(web, asesor).andExpect(status().isBadRequest());
        ObjectNode otro = registro("Ana", "ana.v@example.com");
        otro.put("canal", "CORREO_POSTAL");
        registrar(otro, asesor).andExpect(status().isBadRequest());
        ObjectNode sinConsentimiento = registro("Ana", "ana.v@example.com");
        sinConsentimiento.remove("consentimientoVerbal");
        registrar(sinConsentimiento, asesor).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("consentimientoVerbal")));
        ObjectNode consentimientoFalso = registro("Ana", "ana.v@example.com");
        consentimientoFalso.put("consentimientoVerbal", false);
        registrar(consentimientoFalso, asesor).andExpect(status().isBadRequest());
        ObjectNode conDni = registro("Ana", "ana.v@example.com");
        conDni.put("dni", "00000000");
        registrar(conDni, asesor).andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail", containsString("dni")));
        for (String campo : new String[] {"consentimiento", "consentimientoVersion", "sitioWeb"}) {
            ObjectNode c = registro("Ana", "ana.v@example.com");
            c.put(campo, campo.equals("consentimiento") ? "true" : "x");
            registrar(c, asesor).andExpect(status().isBadRequest());
        }
        ObjectNode nombre = registro("Ana María Pérez Gómez de la Torre y Sotomayor", "ana.v@example.com");
        registrar(nombre, asesor).andExpect(status().isBadRequest());
        ObjectNode celular = registro("Ana", "123");
        celular.put("medio", "CELULAR");
        registrar(celular, asesor).andExpect(status().isBadRequest());
        ObjectNode mensaje = registro("Ana", "ana.v@example.com");
        mensaje.put("mensaje", "Mi documento es 12345678");
        registrar(mensaje, asesor).andExpect(status().isBadRequest());
        ObjectNode proyectoInexistente = registro("Ana", "ana.v@example.com");
        proyectoInexistente.put("proyectoCodigo", "no-existe");
        registrar(proyectoInexistente, asesor).andExpect(status().isNotFound());
        assertThat(intereses()).as("nada se guardó").isEqualTo(antes);
    }

    @Test
    @DisplayName("Panel: sin límite por IP (12 registros seguidos desde la misma IP) y el formulario público sigue siendo WEB")
    void sinLimitePorIp() throws Exception {
        String asesor = token("asesor-01");
        for (int i = 0; i < 12; i++) {
            ObjectNode c = registro("Referido", "referido" + i + "@example.com");
            c.put("canal", i % 2 == 0 ? "REFERIDO" : "WHATSAPP");
            mvc.perform(post("/api/v1/interesados").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(c)).header("Authorization", asesor).with(r -> {
                        r.setRemoteAddr("10.9.9.9");
                        return r;
                    })).andExpect(status().isCreated());
        }
        ObjectNode web = json.createObjectNode();
        web.put("nombre", "Valeria");
        web.put("medio", "CORREO");
        web.put("contacto", "valeria.web@example.com");
        web.put("consentimiento", true);
        web.put("consentimientoVersion", "2026-11-v1");
        mvc.perform(post("/api/v1/publico/interes").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(web)).with(r -> {
                    r.setRemoteAddr("10.9.9.10");
                    return r;
                })).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select canal || '|' || consentimiento_forma || '|' "
                + "|| coalesce(consentimiento_registrado_por, '-') from interes where contacto = 'valeria.web@example.com'",
                String.class)).isEqualTo("WEB|FORMULARIO|-");
        // La precarga queda como llegada por el formulario web.
        assertThat(jdbc.queryForObject("select count(*) from interes where contacto = 'maria.ventas@example.com' "
                + "and canal = 'WEB' and consentimiento_forma = 'FORMULARIO'", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("V23 sobre una base existente: los interesados quedan como WEB y FORMULARIO; lo verbal exige quién lo registró")
    void migracionV23() {
        SingleConnectionDataSource ds = new SingleConnectionDataSource("jdbc:h2:mem:migracion-v23-" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH", "sa", "", true);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("22").load().migrate();
        JdbcTemplate j = new JdbcTemplate(ds);
        String insertar = "insert into interes (creado_en, actualizado_en, origen, forma_pago, nombre, medio, contacto, "
                + "consentimiento, consentimiento_version, consentimiento_en, etapa) values (current_timestamp, "
                + "current_timestamp, 'GENERAL', 'POR_DEFINIR', 'Ana', 'CORREO', 'ana@example.com', true, '2026-11-v1', "
                + "current_timestamp, 'NUEVO')";
        j.update(insertar);
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").target("23").load().migrate();
        assertThat(j.queryForObject("select canal || '|' || consentimiento_forma from interes", String.class))
                .isEqualTo("WEB|FORMULARIO");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> j.update("update interes set canal = 'LLAMADA', "
                + "consentimiento_forma = 'VERBAL'")).isInstanceOf(Exception.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> j.update("update interes set canal = 'FAX'"))
                .isInstanceOf(Exception.class);
        j.update("update interes set canal = 'LLAMADA', consentimiento_forma = 'VERBAL', "
                + "consentimiento_registrado_por = 'asesor-01'");
        assertThat(j.queryForObject("select consentimiento_registrado_por from interes", String.class)).isEqualTo("asesor-01");
    }

    // ------------------------------------------------------------------ portada

    @Test
    @DisplayName("Portada: /publico/sitio da las cifras reales (inmuebles publicados, proyectos y lotes disponibles)")
    void cifrasDelSitio() throws Exception {
        JsonNode s = json.readTree(mvc.perform(get("/api/v1/publico/sitio")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        JsonNode cifras = s.get("cifras");
        int catalogo = json.readTree(mvc.perform(get("/api/v1/publico/inmuebles")).andReturn().getResponse()
                .getContentAsString()).get("total").asInt();
        assertThat(cifras.get("inmueblesPublicados").asInt()).isEqualTo(catalogo).isEqualTo(ofrecidosEnCatalogo());
        // Los tres proyectos con lotes (el cuarto empieza vacío y no se ve hasta cargar su CSV).
        assertThat(cifras.get("proyectos").asInt()).isEqualTo(3);
        int disponibles = 0;
        for (String p : new String[] {VENTISCA, "rinconada-del-lucumo", "terrazas-de-sauzal"}) {
            disponibles += json.readTree(mvc.perform(get("/api/v1/publico/proyectos/" + p)).andReturn().getResponse()
                    .getContentAsString()).get("conteo").get("disponibles").asInt();
        }
        assertThat(cifras.get("lotesDisponibles").asInt()).isEqualTo(disponibles).isPositive();
        assertThat(s.get("version").asString()).isNotBlank();
    }

    // ------------------------------------------------------------------ marca

    @Test
    @DisplayName("Marca: empresa.json con los datos de LEDCONS y el logo en el classpath para los PDF")
    void empresa() throws Exception {
        Empresa e = Empresa.datos();
        assertThat(e.nombreComercial()).isEqualTo("LEDCONS");
        assertThat(e.razonSocial()).isEqualTo("LEDCONS E.I.R.L.");
        assertThat(e.ruc()).isEqualTo("20600817133");
        assertThat(e.eslogan()).isEqualTo("Inmobiliaria y Constructora");
        assertThat(e.direccion()).isEqualTo("Av. San Martín 577, 2.º piso, oficina 32, Ica");
        assertThat(e.telefonos()).containsExactly("991 108 224", "904 958 416");
        assertThat(e.whatsapp()).isEqualTo("51991108224");
        assertThat(e.facebook()).isEqualTo("https://www.facebook.com/Constructora.Inmobiliaria.Ledcons.sac/");
        assertThat(new ClassPathResource(e.logoPdf()).exists()).isTrue();
        byte[] png = Empresa.logoPng();
        assertThat(png.length).isGreaterThan(1000);
        assertThat(new String(png, 1, 3, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("PNG");
    }

    @Test
    @DisplayName("Marca: la ficha registral, la lámina y el documento del lote llevan el nombre y el logo de la empresa")
    void pdfConLaEmpresa() throws Exception {
        String[] rutas = {TINGUINA + "/documento", TINGUINA + "/planos/ARQUITECTURA/documento",
                SANTIAGO + "/documentos-lote/PLANO_PERIMETRICO/documento"};
        for (String r : rutas) {
            byte[] pdf = mvc.perform(get("/api/v1/publico/inmuebles/" + r)).andExpect(status().isOk()).andReturn()
                    .getResponse().getContentAsByteArray();
            try (PDDocument doc = Loader.loadPDF(pdf)) {
                assertThat(new PDFTextStripper().getText(doc)).as(r).contains("LEDCONS")
                        .doesNotContain("TRUSTINMUEBLES ·");
                assertThat(doc.getDocumentInformation().getAuthor()).as(r).isEqualTo("LEDCONS");
                assertThat(doc.getPage(0).getResources().getXObjectNames()).as(r + ": logo").isNotEmpty();
            }
        }
    }

    @Test
    @DisplayName("Marca: WhatsApp de la variable si está, si no el de empresa.json; el enlace wa.me usa solo dígitos")
    void whatsapp() throws Exception {
        // La regla de la variable frente a empresa.json se prueba en InteresUnidadTest; aquí, lo que da la API sin variable.
        mvc.perform(get("/api/v1/publico/contacto")).andExpect(jsonPath("$.whatsapp").value("51991108224"))
                .andExpect(jsonPath("$.whatsapp").value(matchesPattern("^51\\d{9}$")));
    }
}
