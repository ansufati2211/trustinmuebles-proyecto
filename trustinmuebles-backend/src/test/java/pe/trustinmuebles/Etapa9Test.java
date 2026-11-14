package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v1.0 (etapa 9): exportar a CSV (lotes e interesados), ubicación y condiciones de pago del proyecto, aviso de
 * interesados nuevos, cuentas de asesor configurables y embudo. Base H2 propia porque cambia proyectos e interesados.
 * Con app.asesores=asesor-01,asesor-02 se prueba que el arranque crea la cuenta que falta.
 */
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:etapa9-${random.uuid};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;"
                + "DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
        "app.asesores=asesor-01, asesor-02,asesor-02"})
class Etapa9Test extends BaseApiTest {
    static final String VENTISCA = "altos-de-ventisca";
    static final String LOTES_CSV = "/api/v1/proyectos/" + VENTISCA + "/lotes/exportar.csv";
    static final String INTERESADOS_CSV = "/api/v1/interesados/exportar.csv";
    static final String[] SIN_PERMISO = {"comprador-01", "revisor-01", "especialista-01", "propietario-01"};

    String asesor() throws Exception {
        return token("asesor-01");
    }

    MvcResult descargar(String ruta, String auth) throws Exception {
        return mvc.perform(get(ruta).header("Authorization", auth)).andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.startsWith("text/csv")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment;")))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andReturn();
    }

    /** Las líneas del CSV, después de comprobar el BOM. */
    static List<String> lineas(byte[] csv) {
        assertThat(Arrays.copyOf(csv, 3)).as("UTF-8 con BOM").containsExactly(0xEF, 0xBB, 0xBF);
        String texto = new String(csv, 3, csv.length - 3, StandardCharsets.UTF_8);
        assertThat(texto).endsWith("\r\n");
        return Arrays.asList(texto.split("\r\n"));
    }

    JsonNode leerJson(org.springframework.test.web.servlet.RequestBuilder r) throws Exception {
        return json.readTree(mvc.perform(r).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    // ------------------------------------------------------------------ exportar lotes

    @Test
    @DisplayName("Lotes CSV: solo el asesor y el gestor; sin sesión 401 y las demás cuentas (también el revisor) 403")
    void lotesPermisos() throws Exception {
        mvc.perform(get(LOTES_CSV)).andExpect(status().isUnauthorized());
        for (String cuenta : SIN_PERMISO) {
            mvc.perform(get(LOTES_CSV).header("Authorization", token(cuenta))).andExpect(status().isForbidden());
        }
        descargar(LOTES_CSV, asesor());
        descargar(LOTES_CSV, gestor());
        mvc.perform(get("/api/v1/proyectos/no-existe/lotes/exportar.csv").header("Authorization", asesor()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Lotes CSV: punto y coma, BOM, las columnas de la carga, un lote por fila y el estado vigente")
    void lotesContenido() throws Exception {
        MvcResult r = descargar(LOTES_CSV, asesor());
        assertThat(r.getResponse().getHeader("Content-Disposition")).contains("lotes-" + VENTISCA + "-");
        List<String> l = lineas(r.getResponse().getContentAsByteArray());
        assertThat(l.get(0)).isEqualTo("manzana;lote;area_m2;precio;moneda;estado;independizacion;zonificacion;codigo_caso");
        int lotes = jdbc.queryForObject("select count(*) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ?", Integer.class, VENTISCA);
        assertThat(l).hasSize(lotes + 1);
        assertThat(l.get(1)).startsWith("A;1;").contains(";PEN;").matches("A;1;\\d+\\.\\d{2};\\d+\\.\\d{2};PEN;"
                + "(DISPONIBLE|SEPARADO|VENDIDO);(EN_PARTIDA_MATRIZ|PARTIDA_PROPIA|NO_CONSTA);[A-Z0-9-]*;\\d*");
        String precioA1 = jdbc.queryForObject("select precio from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ? and l.manzana = 'A' and l.numero = 1", java.math.BigDecimal.class, VENTISCA)
                .setScale(2).toPlainString();
        assertThat(l.get(1).split(";")[3]).isEqualTo(precioA1);
    }

    @Test
    @DisplayName("Lotes CSV: ida y vuelta; volver a cargar el archivo exportado no cambia ningún lote")
    void lotesIdaYVuelta() throws Exception {
        byte[] csv = descargar(LOTES_CSV, gestor()).getResponse().getContentAsByteArray();
        MockMultipartFile f = new MockMultipartFile("archivo", "lotes.csv", "text/csv", csv);
        JsonNode v = json.readTree(mvc.perform(multipart("/api/v1/proyectos/" + VENTISCA + "/lotes/carga/vista-previa")
                .file(f).header("Authorization", asesor())).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString());
        assertThat(v.get("valida").asBoolean()).isTrue();
        assertThat(v.get("conErrores").asInt()).isZero();
        assertThat(v.get("nuevas").asInt()).isZero();
        assertThat(v.get("actualizadas").asInt()).isZero();
        assertThat(v.get("sinCambios").asInt()).isEqualTo(lineas(csv).size() - 1);
    }

    @Test
    @DisplayName("CSV: un texto que empieza con =, +, - o @ no se ejecuta como fórmula en Excel; «;» y comillas se citan")
    void protegeFormulas() {
        byte[] csv = pe.trustinmuebles.shared.EscritorCsv.excel(List.of("a", "b"),
                List.of(Arrays.asList("=1+1", "+51 999"), Arrays.asList("-x", "@suma"), Arrays.asList("uno;dos", "di \"hola\""),
                        Arrays.asList(null, "")));
        List<String> l = lineas(csv);
        assertThat(l).containsExactly("a;b", "'=1+1;'+51 999", "'-x;'@suma", "\"uno;dos\";\"di \"\"hola\"\"\"", ";");
    }

    // ------------------------------------------------------------------ exportar interesados

    @Test
    @DisplayName("Interesados CSV: solo el asesor y el gestor; sin sesión 401 y las demás cuentas 403")
    void interesadosPermisos() throws Exception {
        mvc.perform(get(INTERESADOS_CSV)).andExpect(status().isUnauthorized());
        for (String cuenta : SIN_PERMISO) {
            mvc.perform(get(INTERESADOS_CSV).header("Authorization", token(cuenta))).andExpect(status().isForbidden());
        }
        descargar(INTERESADOS_CSV, asesor());
        descargar(INTERESADOS_CSV, gestor());
    }

    @Test
    @DisplayName("Interesados CSV: encabezado legible, una fila por interesado y los mismos filtros que la bandeja")
    void interesadosContenido() throws Exception {
        String a = asesor();
        List<String> todos = lineas(descargar(INTERESADOS_CSV, a).getResponse().getContentAsByteArray());
        assertThat(todos.get(0)).startsWith("Registrado el;Nombre;Medio;Contacto;Canal;Etapa;Inmueble o búsqueda;Proyecto;")
                .endsWith(";Acción vencida;Cita por confirmar;Notas");
        JsonNode lista = leerJson(get("/api/v1/interesados").header("Authorization", a));
        assertThat(todos).hasSize(lista.size() + 1);
        // Mismo orden que la bandeja: el primero de la lista es la primera fila.
        assertThat(todos.get(1).split(";")[1]).isEqualTo(lista.get(0).get("nombre").asString());
        assertThat(todos.get(1)).contains(lista.get(0).get("contacto").asString());

        JsonNode nuevos = leerJson(get("/api/v1/interesados").param("etapa", "NUEVO").header("Authorization", a));
        List<String> soloNuevos = lineas(mvc.perform(get(INTERESADOS_CSV).param("etapa", "NUEVO").header("Authorization", a))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
        assertThat(soloNuevos).hasSize(nuevos.size() + 1);
        assertThat(soloNuevos.subList(1, soloNuevos.size())).allSatisfy(f -> assertThat(f.split(";")[5]).isEqualTo("Nuevo"));

        JsonNode delProyecto = leerJson(get("/api/v1/interesados").param("proyecto", VENTISCA).header("Authorization", a));
        List<String> filtrado = lineas(mvc.perform(get(INTERESADOS_CSV).param("proyecto", VENTISCA)
                .header("Authorization", a)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
        assertThat(filtrado).hasSize(delProyecto.size() + 1);
        assertThat(filtrado.subList(1, filtrado.size())).allSatisfy(f -> assertThat(f).contains(";Altos de Ventisca;"));
    }

    // ------------------------------------------------------------------ ubicación y condiciones de pago

    ObjectNode datos(String direccion, String mapa, String condiciones) {
        ObjectNode c = json.createObjectNode();
        c.put("direccion", direccion);
        c.put("mapaUrl", mapa);
        c.put("condicionesPago", condiciones);
        return c;
    }

    org.springframework.test.web.servlet.ResultActions guardar(String proyecto, ObjectNode cuerpo, String auth)
            throws Exception {
        var req = put("/api/v1/proyectos/" + proyecto + "/datos").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(cuerpo));
        return mvc.perform(auth == null ? req : req.header("Authorization", auth));
    }

    @Test
    @DisplayName("Precarga: los cuatro proyectos tienen una dirección referencial, sin enlace de mapa ni condiciones de pago")
    void precargaDirecciones() {
        var filas = jdbc.queryForList("select codigo, direccion, mapa_url, condiciones_pago from proyecto where codigo in "
                + "('altos-de-ventisca', 'rinconada-del-lucumo', 'terrazas-de-sauzal', 'horizonte-de-los-aquijes')");
        assertThat(filas).hasSize(4).allSatisfy(f -> {
            assertThat((String) f.get("direccion")).isNotBlank().endsWith("Ica");
            assertThat(f.get("mapa_url")).isNull();
            assertThat(f.get("condiciones_pago")).isNull();
        });
        assertThat(jdbc.queryForObject("select direccion from proyecto where codigo = 'terrazas-de-sauzal'", String.class))
                .contains("Salas");
        assertThat(jdbc.queryForObject("select count(*) from ajuste_contenido where clave = 'v1.0-etapa-9-direcciones'",
                Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("Datos del proyecto: el asesor y el gestor los guardan; el revisor y el comprador no (403), sin sesión 401")
    void datosPermisos() throws Exception {
        String sauzal = "terrazas-de-sauzal";
        ObjectNode c = datos("Sector El Sauzal, Salas, Ica", null, null);
        guardar(sauzal, c, null).andExpect(status().isUnauthorized());
        guardar(sauzal, c, revisor()).andExpect(status().isForbidden());
        guardar(sauzal, c, comprador()).andExpect(status().isForbidden());
        guardar(sauzal, c, gestor()).andExpect(status().isOk()).andExpect(jsonPath("$.direccion").value("Sector El Sauzal, Salas, Ica"));
        guardar("no-existe", c, asesor()).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Ubicación: la página del proyecto y la ficha del lote muestran la dirección y el enlace «Cómo llegar»")
    void ubicacionPublica() throws Exception {
        String lucumo = "rinconada-del-lucumo";
        String mapa = "https://maps.app.goo.gl/EjemploLucumo123";
        String condiciones = "Inicial desde S/ 5,000.\nSaldo en cuotas directas con la inmobiliaria.";
        guardar(lucumo, datos("  Camino a Chanchajalla   s/n, La Tinguiña, Ica ", mapa, condiciones), asesor())
                .andExpect(status().isOk()).andExpect(jsonPath("$.direccion").value("Camino a Chanchajalla s/n, La Tinguiña, Ica"))
                .andExpect(jsonPath("$.mapaUrl").value(mapa)).andExpect(jsonPath("$.condicionesPago").value(condiciones));
        JsonNode p = leerJson(get("/api/v1/publico/proyectos/" + lucumo));
        assertThat(p.get("direccion").asString()).isEqualTo("Camino a Chanchajalla s/n, La Tinguiña, Ica");
        assertThat(p.get("mapaUrl").asString()).isEqualTo(mapa);
        assertThat(p.get("condicionesPago").asString()).isEqualTo(condiciones);
        String clave = null;
        for (JsonNode l : p.get("lotes")) {
            if (l.get("publicado").asBoolean() && l.get("casoCodigo").isNull()) {
                clave = l.get("clave").asString();
                break;
            }
        }
        assertThat(clave).isNotNull();
        JsonNode lote = leerJson(get("/api/v1/publico/proyectos/" + lucumo + "/lotes/" + clave));
        assertThat(lote.get("proyectoDireccion").asString()).isEqualTo("Camino a Chanchajalla s/n, La Tinguiña, Ica");
        assertThat(lote.get("proyectoMapaUrl").asString()).isEqualTo(mapa);

        // Vacío borra el dato.
        guardar(lucumo, datos("", " ", null), asesor()).andExpect(status().isOk())
                .andExpect(jsonPath("$.direccion").isEmpty()).andExpect(jsonPath("$.mapaUrl").isEmpty())
                .andExpect(jsonPath("$.condicionesPago").isEmpty());
        JsonNode sin = leerJson(get("/api/v1/publico/proyectos/" + lucumo));
        assertThat(sin.get("mapaUrl").isNull()).isTrue();
        assertThat(sin.get("condicionesPago").isNull()).isTrue();
    }

    @Test
    @DisplayName("Ubicación: el enlace debe ser https con dominio; http, javascript: o texto suelto dan 400 y no se guarda")
    void enlaceInvalido() throws Exception {
        String aquijes = "horizonte-de-los-aquijes";
        String antes = jdbc.queryForObject("select direccion from proyecto where codigo = ?", String.class, aquijes);
        for (String malo : new String[] {"http://maps.google.com/x", "javascript:alert(1)", "maps.google.com", "https://localhost/x",
                "https://ejemplo .com"}) {
            guardar(aquijes, datos("Otra dirección", malo, null), asesor()).andExpect(status().isBadRequest());
        }
        assertThat(jdbc.queryForObject("select direccion from proyecto where codigo = ?", String.class, aquijes)).isEqualTo(antes);
    }

    @Test
    @DisplayName("Condiciones de pago: hasta 500 caracteres (501 da 400) y la dirección hasta 200")
    void limites() throws Exception {
        String ventisca = VENTISCA;
        guardar(ventisca, datos(null, null, "x".repeat(501)), gestor()).andExpect(status().isBadRequest());
        guardar(ventisca, datos("d".repeat(201), null, null), gestor()).andExpect(status().isBadRequest());
        String antes = jdbc.queryForObject("select direccion from proyecto where codigo = ?", String.class, ventisca);
        guardar(ventisca, datos(antes, null, "c".repeat(500)), gestor()).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select length(condiciones_pago) from proyecto where codigo = ?", Integer.class,
                ventisca)).isEqualTo(500);
        guardar(ventisca, datos(antes, null, null), gestor()).andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ aviso de nuevos

    @Test
    @DisplayName("Aviso: /interesados/nuevos cuenta los de etapa NUEVO y baja al cambiar la etapa; solo asesor y gestor")
    void avisoNuevos() throws Exception {
        String a = asesor();
        mvc.perform(get("/api/v1/interesados/nuevos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/interesados/nuevos").header("Authorization", comprador())).andExpect(status().isForbidden());
        long enBase = jdbc.queryForObject("select count(*) from interes where etapa = 'NUEVO'", Long.class);
        assertThat(enBase).isPositive();
        assertThat(leerJson(get("/api/v1/interesados/nuevos").header("Authorization", a)).get("nuevos").asLong())
                .isEqualTo(enBase);
        assertThat(leerJson(get("/api/v1/interesados/nuevos").header("Authorization", gestor())).get("nuevos").asLong())
                .isEqualTo(enBase);
        long id = jdbc.queryForObject("select min(id) from interes where etapa = 'NUEVO'", Long.class);
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"CONTACTADO\"}")).andExpect(status().isOk());
        assertThat(leerJson(get("/api/v1/interesados/nuevos").header("Authorization", a)).get("nuevos").asLong())
                .isEqualTo(enBase - 1);
        mvc.perform(put("/api/v1/interesados/" + id + "/etapa").header("Authorization", a)
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"NUEVO\"}")).andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ cuentas de asesor

    @Test
    @DisplayName("app.asesores: el arranque crea asesor-02 (ASESOR) con la contraseña de la semilla, sin repetir asesor-01")
    void asesoresConfigurables() throws Exception {
        assertThat(jdbc.queryForObject("select count(*) from usuario where codigo_cuenta = 'asesor-02' and rol = 'ASESOR'",
                Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from usuario where codigo_cuenta = 'asesor-01'", Integer.class))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(CUENTAS_DEMO + 1);
        mvc.perform(get("/api/v1/auth/me").header("Authorization", token("asesor-02"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("ASESOR")).andExpect(jsonPath("$.funcion").value("Asesor inmobiliario"));
        // Puede ser responsable y trabajar en la bandeja.
        JsonNode op = leerJson(get("/api/v1/interesados/opciones").header("Authorization", token("asesor-02")));
        List<String> responsables = new java.util.ArrayList<>();
        op.get("responsables").forEach(r -> responsables.add(r.asString()));
        assertThat(responsables).containsExactly("asesor-01", "asesor-02", "gestor-01");
    }

    @Test
    @DisplayName("app.asesores: la lista se limpia (espacios, mayúsculas, repetidos) y un código inválido detiene el arranque")
    void listaAsesores() {
        assertThat(pe.trustinmuebles.identidad.CuentasAsesores.de(" asesor-01, ASESOR-02 ,,asesor-02"))
                .containsExactly("asesor-01", "asesor-02");
        assertThat(pe.trustinmuebles.identidad.CuentasAsesores.de("")).isEmpty();
        assertThat(pe.trustinmuebles.identidad.CuentasAsesores.de(null)).isEmpty();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> pe.trustinmuebles.identidad.CuentasAsesores.de("asesor 03"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("asesor 03");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> pe.trustinmuebles.identidad.CuentasAsesores.de("a!"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ------------------------------------------------------------------ embudo

    @Test
    @DisplayName("Embudo: cantidad y porcentaje por etapa del total y de cada proyecto; las etapas suman el total")
    void embudo() throws Exception {
        mvc.perform(get("/api/v1/interesados/embudo").header("Authorization", comprador())).andExpect(status().isForbidden());
        JsonNode e = leerJson(get("/api/v1/interesados/embudo").header("Authorization", asesor()));
        long total = jdbc.queryForObject("select count(*) from interes", Long.class);
        JsonNode t = e.get("total");
        assertThat(t.get("total").asLong()).isEqualTo(total);
        assertThat(t.get("etapas")).hasSize(7);
        long suma = 0;
        for (JsonNode x : t.get("etapas")) {
            suma += x.get("cantidad").asLong();
            long enBase = jdbc.queryForObject("select count(*) from interes where etapa = ?", Long.class,
                    x.get("etapa").asString());
            assertThat(x.get("cantidad").asLong()).isEqualTo(enBase);
            assertThat(x.get("porcentaje").decimalValue()).isEqualByComparingTo(
                    java.math.BigDecimal.valueOf(enBase * 100.0 / total).setScale(1, java.math.RoundingMode.HALF_UP));
        }
        assertThat(suma).isEqualTo(total);
        long sumaProyectos = 0;
        for (JsonNode fila : e.get("porProyecto")) {
            long n = fila.get("total").asLong();
            assertThat(n).isPositive();
            sumaProyectos += n;
            long etapas = 0;
            for (JsonNode x : fila.get("etapas")) etapas += x.get("cantidad").asLong();
            assertThat(etapas).isEqualTo(n);
            if (!fila.get("clave").asString().equals("SIN_PROYECTO")) {
                assertThat(n).isEqualTo(jdbc.queryForObject("select count(*) from interes where proyecto_codigo = ?",
                        Long.class, fila.get("clave").asString()));
            }
        }
        assertThat(sumaProyectos).as("los proyectos y «sin proyecto» suman el total").isEqualTo(total);
    }
}
