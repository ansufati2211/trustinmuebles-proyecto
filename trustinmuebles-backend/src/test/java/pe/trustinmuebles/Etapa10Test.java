package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ApplicationContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 10): primer proyecto real de LedCons, Sol de Carhuaz – IV etapa. Revisa su precarga (también en una base
 * existente y sin pisar lo editado), la partida matriz interna con el indicador A en gris, los lotes con letra (10A) y
 * la carga del CSV real de 214 lotes. Base H2 propia porque la carga cambia los lotes del proyecto.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:etapa10-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class Etapa10Test extends BaseApiTest {
    static final String SOL = "sol-de-carhuaz-iv-etapa";
    static final String BASE = "/api/v1/proyectos/" + SOL + "/lotes";
    static final String CABECERA = "manzana,lote,area_m2,precio,moneda,estado,independizacion,zonificacion,codigo_caso\r\n";
    static final Path KIT = Path.of("..", "docs", "demo", "kit", "sol-de-carhuaz-iv-etapa-lotes.csv");

    @Autowired ApplicationContext contexto;

    @BeforeEach
    void dejarVacio() {
        jdbc.update("delete from lote_proyecto where proyecto_id = (select id from proyecto where codigo = ?)", SOL);
        jdbc.update("delete from historial_lote_proyecto where proyecto_codigo = ?", SOL);
    }

    static MockMultipartFile csv(byte[] bytes) {
        return new MockMultipartFile("archivo", "lotes.csv", "text/csv", bytes);
    }

    static MockMultipartFile csv(String contenido) {
        return csv(contenido.getBytes(StandardCharsets.UTF_8));
    }

    ResultActions previa(MockMultipartFile f) throws Exception {
        return mvc.perform(multipart(BASE + "/carga/vista-previa").file(f).header("Authorization", token("asesor-01")));
    }

    ResultActions confirmar(MockMultipartFile f) throws Exception {
        return mvc.perform(multipart(BASE + "/carga").file(f).header("Authorization", token("asesor-01")));
    }

    JsonNode json(ResultActions r) throws Exception {
        return this.json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    int lotes() {
        return jdbc.queryForObject("select count(*) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ?", Integer.class, SOL);
    }

    /** Vuelve a correr una de las precargas del arranque, como en el reinicio de una base que ya existe. */
    void arrancar(String clase) throws Exception {
        for (ApplicationRunner r : contexto.getBeansOfType(ApplicationRunner.class).values()) {
            if (org.springframework.aop.support.AopUtils.getTargetClass(r).getSimpleName().equals(clase)) {
                r.run(org.mockito.Mockito.mock(ApplicationArguments.class));
                return;
            }
        }
        throw new AssertionError("No hay precarga " + clase);
    }

    // ------------------------------------------------------------------ precarga

    @Test
    @DisplayName("El proyecto nace con los datos de LedCons, sin lotes, sin mapa y con hitos sin fecha")
    void precarga() throws Exception {
        Map<String, Object> p = jdbc.queryForMap("select * from proyecto where codigo = ?", SOL);
        assertThat(p.get("nombre")).isEqualTo("Sol de Carhuaz – IV etapa");
        assertThat(p.get("distrito")).isEqualTo("Ica");
        assertThat(p.get("direccion")).isEqualTo("Km 10 de la carretera a Carhuaz, Ica");
        assertThat(p.get("mapa_url")).isNull();
        assertThat(p.get("recorrido_url")).isNull();
        assertThat(p.get("condiciones_pago").toString()).contains("S/ 1 000", "75 cuotas sin intereses", "S/ 500", "S/ 200");
        assertThat(p.get("caso_matriz_codigo")).isEqualTo(MATRIZ_CARHUAZ);
        assertThat(lotes()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from proyecto where nombre like 'Sol de Carhuaz%'", Integer.class))
                .as("un solo proyecto").isEqualTo(1);

        List<Map<String, Object>> hitos = jdbc.queryForList("select h.nombre, h.estado, h.fecha from hito_proyecto h "
                + "join proyecto p on p.id = h.proyecto_id where p.codigo = ? order by h.orden", SOL);
        assertThat(hitos).extracting(h -> h.get("nombre")).containsExactly("Lanzamiento de la IV etapa (preventa)", "Luz",
                "Agua", "Desagüe");
        assertThat(hitos).extracting(h -> h.get("estado")).containsExactly("EN_PROCESO", "PENDIENTE", "PENDIENTE", "PENDIENTE");
        assertThat(hitos).extracting(h -> h.get("fecha")).containsOnlyNulls();
        // El caso de la partida matriz quedó vinculado al proyecto, sin crear otro.
        assertThat(jdbc.queryForObject("select proyecto_codigo from caso_lote where codigo = ?", String.class, MATRIZ_CARHUAZ))
                .isEqualTo(SOL);
    }

    @Test
    @DisplayName("La partida matriz es un registro interno (INT-), sin asientos, con el indicador A gris y autorización vigente de la inmobiliaria")
    void partidaMatriz() throws Exception {
        Map<String, Object> c = jdbc.queryForMap("select * from caso_lote where codigo = ?", MATRIZ_CARHUAZ);
        assertThat(c.get("fuente")).isEqualTo("Registro interno de cartera");
        assertThat(c.get("sintetico")).isEqualTo(true);
        assertThat(c.get("origen")).isEqualTo("SINTETICO");
        assertThat(c.get("titularidad_comercial")).isEqualTo("INMOBILIARIA");
        assertThat(c.get("estado_publicacion")).isEqualTo("BORRADOR");
        assertThat(c.get("autorizacion_fecha")).as("autorización vigente").isNotNull();
        assertThat(jdbc.queryForObject("select count(*) from historial_autorizacion where caso_codigo = ? "
                + "and accion = 'OTORGADA' and en_nombre_de = 'INMOBILIARIA'", Integer.class, MATRIZ_CARHUAZ)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from asiento a join expediente e on e.id = a.expediente_id "
                + "join caso_lote c on c.id = e.caso_id where c.codigo = ?", Integer.class, MATRIZ_CARHUAZ))
                .as("sin asientos inventados").isZero();

        JsonNode caso = leerComo(MATRIZ_CARHUAZ, token("asesor-01"));
        assertThat(caso.get("evaluacion").get("estado").asString()).isEqualTo("GRIS");
        assertThat(caso.get("evaluacion").toString()).contains("Faltan datos mínimos");
        // No se ofrece como un inmueble ni se muestra al comprador, pero sus lotes sí se podrán ofrecer.
        mvc.perform(get("/api/v1/casos/" + MATRIZ_CARHUAZ).header("Authorization", comprador()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Reiniciar sobre una base que ya lo tiene no duplica nada ni pisa lo que el asesor editó; si falta el proyecto, vuelve a nacer")
    void idempotente() throws Exception {
        int casos = jdbc.queryForObject("select count(*) from caso_lote", Integer.class);
        int proyectos = jdbc.queryForObject("select count(*) from proyecto", Integer.class);
        // El asesor edita dirección, pago y mapa, y quita un hito.
        jdbc.update("update proyecto set direccion = 'Otra dirección', condiciones_pago = 'Otro pago', "
                + "mapa_url = 'https://maps.example/x' where codigo = ?", SOL);
        jdbc.update("delete from hito_proyecto where nombre = 'Luz'");

        arrancar("CasosSeeder");
        arrancar("ProyectosSeeder");
        assertThat(jdbc.queryForObject("select count(*) from caso_lote", Integer.class)).isEqualTo(casos);
        assertThat(jdbc.queryForObject("select count(*) from proyecto", Integer.class)).isEqualTo(proyectos);
        Map<String, Object> p = jdbc.queryForMap("select * from proyecto where codigo = ?", SOL);
        assertThat(p.get("direccion")).isEqualTo("Otra dirección");
        assertThat(p.get("condiciones_pago")).isEqualTo("Otro pago");
        assertThat(p.get("mapa_url")).isEqualTo("https://maps.example/x");
        assertThat(jdbc.queryForObject("select count(*) from hito_proyecto h join proyecto p on p.id = h.proyecto_id "
                + "where p.codigo = ?", Integer.class, SOL)).as("los hitos no se reponen").isEqualTo(3);
        assertThat(jdbc.queryForObject("select count(*) from historial_autorizacion where caso_codigo = ?", Integer.class,
                MATRIZ_CARHUAZ)).isEqualTo(1);

        // Una base existente a la que todavía le falta el proyecto lo recibe con su dirección y su pago (los ajustes
        // de una sola vez de la etapa 9 ya están marcados y no lo harían).
        jdbc.update("delete from hito_proyecto where proyecto_id = (select id from proyecto where codigo = ?)", SOL);
        jdbc.update("update caso_lote set proyecto_codigo = null where proyecto_codigo = ?", SOL);
        jdbc.update("delete from proyecto where codigo = ?", SOL);
        arrancar("ProyectosSeeder");
        p = jdbc.queryForMap("select * from proyecto where codigo = ?", SOL);
        assertThat(p.get("direccion")).isEqualTo("Km 10 de la carretera a Carhuaz, Ica");
        assertThat(p.get("condiciones_pago").toString()).startsWith("Crédito directo");
        assertThat(p.get("caso_matriz_codigo")).isEqualTo(MATRIZ_CARHUAZ);
        assertThat(jdbc.queryForObject("select count(*) from proyecto", Integer.class)).isEqualTo(proyectos);
    }

    // ------------------------------------------------------------------ lotes con letra

    @Test
    @DisplayName("La carga acepta lotes con letra (10A, 15C) y manzanas con letra (228A); un lote numérico sigue igual")
    void lotesConLetra() throws Exception {
        String cuerpo = CABECERA + "228A,10A,108.99,24595.77,PEN,DISPONIBLE,NO_CONSTA,,\r\n"
                + "228A,10B,108.99,24595.77,PEN,DISPONIBLE,NO_CONSTA,,\r\n"
                + "236,12c,102.03,27548.10,PEN,DISPONIBLE,NO_CONSTA,,\r\n"
                + "236,7,104.00,28080.00,PEN,DISPONIBLE,NO_CONSTA,,\r\n"
                + "236,007B,104.00,28080.00,PEN,DISPONIBLE,NO_CONSTA,,\r\n";
        JsonNode v = json(previa(csv(cuerpo)).andExpect(status().isOk()));
        assertThat(v.get("conErrores").asInt()).as(v.toString()).isZero();
        assertThat(v.get("nuevas").asInt()).isEqualTo(5);
        assertThat(v.get("filas")).extracting(f -> f.get("clave").asString())
                .containsExactly("228A-10A", "228A-10B", "236-12C", "236-7", "236-7B");

        confirmar(csv(cuerpo)).andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(5));
        assertThat(lotes()).isEqualTo(5);
        assertThat(jdbc.queryForList("select numero, sufijo from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ? and l.manzana = '236' order by l.numero, l.sufijo", SOL))
                .extracting(f -> f.get("numero") + ":" + f.get("sufijo")).containsExactly("7:", "7:B", "12:C");

        // Volver a cargarlo no cambia nada y no confunde 10A con 10 ni con 10B.
        confirmar(csv(cuerpo)).andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(0))
                .andExpect(jsonPath("$.sinCambios").value(5));
        // Un lote 10 (sin letra) es otro lote distinto de 10A.
        JsonNode otro = json(previa(csv(CABECERA + "228A,10,108.99,24595.77,PEN,DISPONIBLE,NO_CONSTA,,\r\n")));
        assertThat(otro.get("filas").get(0).get("accion").asString()).isEqualTo("NUEVO");

        // El historial se consulta por la clave con letra, y el CSV exportado vuelve a dar «10A».
        mvc.perform(get(BASE + "/228A-10A/historial").header("Authorization", token("asesor-01")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].accion").value("CREADO"));
        String exportado = new String(mvc.perform(get(BASE + "/exportar.csv").header("Authorization", token("asesor-01")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        assertThat(exportado).contains("228A;10A;108.99;24595.77;PEN;DISPONIBLE;NO_CONSTA", "236;12C;102.03;27548.10");
        assertThat(exportado.indexOf("228A;10A;")).isLessThan(exportado.indexOf("228A;10B;"));
    }

    @Test
    @DisplayName("Lotes mal escritos con letras se rechazan con un mensaje claro; no se acepta más de dos letras ni letra antes del número")
    void lotesConLetraInvalidos() throws Exception {
        for (String malo : new String[] {"A10", "10ABC", "10-A", "0A", "10 A", "10.5", "-3", "ñ"}) {
            JsonNode v = json(previa(csv(CABECERA + "A," + malo + ",140,35000,PEN,DISPONIBLE,,,\r\n")).andExpect(status().isOk()));
            assertThat(v.get("conErrores").asInt()).as(malo).isEqualTo(1);
            assertThat(v.get("filas").get(0).get("errores").toString()).as(malo).contains("lote:", "no es válido");
        }
        // Una letra repetida (10a y 10A) es el mismo lote dos veces.
        JsonNode dup = json(previa(csv(CABECERA + "A,10a,140,35000,PEN,DISPONIBLE,,,\r\nA,10A,140,35000,PEN,DISPONIBLE,,,\r\n")));
        assertThat(dup.get("filas").get(1).get("errores").toString()).contains("ya aparece en la fila 2");
        assertThat(lotes()).isZero();
    }

    @Test
    @DisplayName("Un lote con letra se ve en la ficha pública del lote, en el plano del proyecto y en el catálogo")
    void lotesConLetraSeVen() throws Exception {
        confirmar(csv(CABECERA + "228A,10A,108.99,24595.77,PEN,DISPONIBLE,NO_CONSTA,,\r\n"
                + "228A,2,108.99,24595.77,PEN,DISPONIBLE,NO_CONSTA,,\r\n")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/publico/proyectos/" + SOL)).andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes[0].clave").value("228A-2"))
                .andExpect(jsonPath("$.lotes[1].clave").value("228A-10A"))
                .andExpect(jsonPath("$.lotes[1].numero").value(10)).andExpect(jsonPath("$.lotes[1].sufijo").value("A"))
                .andExpect(jsonPath("$.lotes[1].publicado").value(true))
                .andExpect(jsonPath("$.indicadorA.evaluacion.estado").value("GRIS"))
                .andExpect(jsonPath("$.indicadorA.casoCodigo").value(MATRIZ_CARHUAZ));
        mvc.perform(get("/api/v1/publico/proyectos/" + SOL + "/lotes/228A-10A")).andExpect(status().isOk())
                .andExpect(jsonPath("$.lote.clave").value("228A-10A"))
                .andExpect(jsonPath("$.denominacion").value(org.hamcrest.Matchers.startsWith("Mz. 228A Lote 10A · Sol de Carhuaz")))
                .andExpect(jsonPath("$.indicadorA.evaluacion.estado").value("GRIS"));
        // Minúsculas en la clave no importan; un lote que no existe es 404.
        mvc.perform(get("/api/v1/publico/proyectos/" + SOL + "/lotes/228a-10a")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/publico/proyectos/" + SOL + "/lotes/228A-10B")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/publico/proyectos/" + SOL + "/lotes/228A-10ABC")).andExpect(status().isNotFound());
        // El catálogo lo ofrece, con su clave y su nombre.
        assertThat(json(mvc.perform(get("/api/v1/publico/inmuebles").param("proyecto", "Sol de Carhuaz – IV etapa")))
                .get("total").asInt()).isEqualTo(2);
    }

    // ------------------------------------------------------------------ la carga real

    @Test
    @DisplayName("Kit: sol-de-carhuaz-iv-etapa-lotes.csv — 214 lotes nuevos sin errores, todos disponibles y NO_CONSTA; la segunda carga no cambia nada")
    void kitReal() throws Exception {
        byte[] archivo = Files.readAllBytes(KIT);
        JsonNode v = json(previa(csv(archivo)).andExpect(status().isOk()));
        assertThat(v.get("valida").asBoolean()).as(v.get("erroresGenerales").toString()).isTrue();
        assertThat(v.get("totalFilas").asInt()).isEqualTo(214);
        assertThat(v.get("nuevas").asInt()).isEqualTo(214);
        assertThat(v.get("conErrores").asInt()).isZero();
        assertThat(lotes()).as("la vista previa no escribe").isZero();

        confirmar(csv(archivo)).andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(214))
                .andExpect(jsonPath("$.actualizados").value(0)).andExpect(jsonPath("$.sinCambios").value(0));
        assertThat(lotes()).isEqualTo(214);
        assertThat(jdbc.queryForObject("select count(*) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ? and l.estado_comercial = 'DISPONIBLE'", Integer.class, SOL)).isEqualTo(214);
        assertThat(jdbc.queryForObject("select count(*) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ? and l.independizacion = 'NO_CONSTA'", Integer.class, SOL)).isEqualTo(214);
        assertThat(jdbc.queryForObject("select count(distinct manzana) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ?", Integer.class, SOL)).isEqualTo(32);
        assertThat(jdbc.queryForObject("select count(*) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ? and l.sufijo <> ''", Integer.class, SOL)).isPositive();
        // Se ofrecen (la partida matriz tiene autorización vigente) y el conteo del portal coincide.
        mvc.perform(get("/api/v1/publico/proyectos/" + SOL)).andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes", org.hamcrest.Matchers.hasSize(214)))
                .andExpect(jsonPath("$.conteo.disponibles").value(214)).andExpect(jsonPath("$.conteo.separados").value(0))
                .andExpect(jsonPath("$.conteo.vendidos").value(0))
                .andExpect(jsonPath("$.lotes[?(@.publicado == false)]", org.hamcrest.Matchers.hasSize(0)))
                .andExpect(jsonPath("$.indicadorA.evaluacion.estado").value("GRIS"));

        // Segunda carga del mismo archivo: «sin cambios» en todas las filas.
        JsonNode otra = json(previa(csv(archivo)).andExpect(status().isOk()));
        assertThat(otra.get("sinCambios").asInt()).isEqualTo(214);
        assertThat(otra.get("nuevas").asInt()).isZero();
        assertThat(otra.get("actualizadas").asInt()).isZero();
        assertThat(otra.get("conErrores").asInt()).isZero();
        assertThat(otra.get("filas")).allMatch(f -> f.get("accion").asString().equals("SIN_CAMBIOS"));
        confirmar(csv(archivo)).andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(0))
                .andExpect(jsonPath("$.actualizados").value(0)).andExpect(jsonPath("$.sinCambios").value(214));
        assertThat(lotes()).isEqualTo(214);
        assertThat(jdbc.queryForObject("select count(*) from historial_lote_proyecto where proyecto_codigo = ?", Integer.class, SOL))
                .as("la segunda carga no agrega historial").isEqualTo(214);
    }

    // ------------------------------------------------------------------ Vista Alegre y el selector de proyectos

    @Test
    @DisplayName("Vista Alegre existe como proyecto solo con su nombre: sin distrito, dirección, pago, mapa, hitos ni lotes")
    void vistaAlegre() throws Exception {
        Map<String, Object> p = jdbc.queryForMap("select * from proyecto where codigo = 'vista-alegre'");
        assertThat(p.get("nombre")).isEqualTo("Vista Alegre");
        for (String campo : new String[] {"distrito", "descripcion", "direccion", "condiciones_pago", "mapa_url",
                "recorrido_url", "caso_matriz_codigo"}) {
            assertThat(p.get(campo)).as(campo).isNull();
        }
        assertThat(jdbc.queryForObject("select count(*) from hito_proyecto h join proyecto p on p.id = h.proyecto_id "
                + "where p.codigo = 'vista-alegre'", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = 'vista-alegre'", Integer.class)).isZero();
        // Sin lotes no se muestra en el portal; el asesor sí lo ve en el panel (sin partida matriz que autorice sus lotes).
        mvc.perform(get("/api/v1/publico/proyectos/vista-alegre")).andExpect(status().isNotFound());
        JsonNode panel = json(mvc.perform(get("/api/v1/proyectos").header("Authorization", token("asesor-01"))).andExpect(status().isOk()));
        JsonNode va = null;
        for (JsonNode x : panel) if (x.get("codigo").asString().equals("vista-alegre")) va = x;
        assertThat(va).isNotNull();
        assertThat(va.get("lotes").asInt()).isZero();
        assertThat(va.get("autorizacionVigente").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("El selector «Proyecto» solo ofrece proyectos de lotes en línea; las casas siguen en el catálogo")
    void selectorSoloProyectosDeLotes() throws Exception {
        JsonNode filtros = json(mvc.perform(get("/api/v1/publico/filtros")).andExpect(status().isOk()));
        List<String> proyectos = new java.util.ArrayList<>();
        filtros.get("proyectos").forEach(x -> proyectos.add(x.asString()));
        assertThat(proyectos).contains("Altos de Ventisca", "Rinconada del Lúcumo", "Terrazas de Sauzal")
                .doesNotContain("Santa Elvira", "Rincón del Sauce", "Mirador del Sol", "Villa del Algarrobo",
                        "Campiña del Olivar", "Jardines del Pacae", "Vista Alegre", "Sol de Carhuaz – IV etapa");
        // C1 (Santa Elvira) sigue publicado y se puede filtrar por su proyecto desde la dirección.
        mvc.perform(get("/api/v1/publico/inmuebles/" + PARCONA)).andExpect(status().isOk());
        assertThat(json(mvc.perform(get("/api/v1/publico/inmuebles").param("proyecto", "Santa Elvira"))).get("total").asInt())
                .isEqualTo(1);
        assertThat(filtros.get("distritos").toString()).contains("Parcona");
    }
}
