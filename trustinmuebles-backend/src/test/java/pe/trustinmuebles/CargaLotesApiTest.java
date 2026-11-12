package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 3b): carga masiva de lotes por CSV. Revisa la vista previa (que no guarda nada), la confirmación de todo o
 * nada, la actualización con historial, los límites (2000 filas y 1 MB), los permisos y los dos archivos del kit de la
 * demostración. Base H2 propia: cada prueba deja vacío el proyecto Horizonte de Los Aquijes al empezar y al terminar.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:carga-lotes-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class CargaLotesApiTest extends BaseApiTest {
    static final String AQUIJES = "horizonte-de-los-aquijes";
    static final String BASE = "/api/v1/proyectos/" + AQUIJES + "/lotes";
    static final String CABECERA = "manzana,lote,area_m2,precio,moneda,estado,independizacion,zonificacion,codigo_caso\r\n";
    static final Path KIT = Path.of("..", "docs", "demo", "kit");

    @BeforeEach
    @AfterEach
    void dejarVacio() {
        jdbc.update("delete from lote_proyecto where proyecto_id = (select id from proyecto where codigo = ?)", AQUIJES);
        jdbc.update("delete from historial_lote_proyecto");
        jdbc.update("update caso_lote set estado_comercial = 'DISPONIBLE' where codigo in ('11045763', '80194645')");
        jdbc.update("update caso_lote set autorizacion_fecha = current_timestamp where codigo = ?", MATRIZ_AQUIJES);
    }

    // ------------------------------------------------------------------ ayudas

    static MockMultipartFile csv(String contenido) {
        return csv(contenido.getBytes(StandardCharsets.UTF_8));
    }

    static MockMultipartFile csv(byte[] bytes) {
        return new MockMultipartFile("archivo", "lotes.csv", "text/csv", bytes);
    }

    static byte[] kit(String nombre) throws Exception {
        return Files.readAllBytes(KIT.resolve(nombre));
    }

    ResultActions previa(MockMultipartFile f, String auth) throws Exception {
        return mvc.perform(multipart(BASE + "/carga/vista-previa").file(f).header("Authorization", auth));
    }

    ResultActions confirmar(MockMultipartFile f, String auth) throws Exception {
        return mvc.perform(multipart(BASE + "/carga").file(f).header("Authorization", auth));
    }

    JsonNode json(ResultActions r) throws Exception {
        return this.json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    JsonNode vista(String contenido) throws Exception {
        return json(previa(csv(contenido), token("asesor-01")).andExpect(status().isOk()));
    }

    int lotes() {
        return jdbc.queryForObject("select count(*) from lote_proyecto where proyecto_id = "
                + "(select id from proyecto where codigo = ?)", Integer.class, AQUIJES);
    }

    /** Un dato de un lote de Horizonte de Los Aquijes (otros proyectos tienen lotes con la misma manzana y número). */
    <T> T dato(String columna, String manzana, int numero, Class<T> tipo) {
        return jdbc.queryForObject("select " + columna + " from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                + "where p.codigo = ? and l.manzana = ? and l.numero = ?", tipo, AQUIJES, manzana, numero);
    }

    int historialLotes() {
        return jdbc.queryForObject("select count(*) from historial_lote_proyecto", Integer.class);
    }

    int historialEvaluaciones() {
        return jdbc.queryForObject("select count(*) from historial_evaluacion", Integer.class);
    }

    /** Los errores de una fila de la vista previa, juntos en un texto. */
    static String errores(JsonNode vista, int linea) {
        for (JsonNode f : vista.get("filas")) if (f.get("fila").asInt() == linea) return f.get("errores").toString();
        throw new AssertionError("No hay fila " + linea);
    }

    // ------------------------------------------------------------------ permisos

    @Test
    @DisplayName("Solo el asesor y el gestor cargan lotes: sin sesión 401; comprador, revisor, propietario y especialista, 403")
    void permisos() throws Exception {
        MockMultipartFile f = csv(CABECERA + "A,1,140,35000,PEN,DISPONIBLE,,RDM,\r\n");
        mvc.perform(multipart(BASE + "/carga/vista-previa").file(f)).andExpect(status().isUnauthorized());
        mvc.perform(multipart(BASE + "/carga").file(f)).andExpect(status().isUnauthorized());
        mvc.perform(get(BASE + "/plantilla.csv")).andExpect(status().isUnauthorized());
        for (String quien : new String[] {comprador(), revisor(), propietario(1), token("especialista-01")}) {
            previa(f, quien).andExpect(status().isForbidden());
            confirmar(f, quien).andExpect(status().isForbidden());
            mvc.perform(get(BASE + "/plantilla.csv").header("Authorization", quien)).andExpect(status().isForbidden());
        }
        assertThat(lotes()).isZero();
        for (String quien : new String[] {token("asesor-01"), gestor()}) {
            previa(f, quien).andExpect(status().isOk());
            mvc.perform(get(BASE + "/plantilla.csv").header("Authorization", quien)).andExpect(status().isOk());
        }
        confirmar(f, gestor()).andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(1));
        assertThat(lotes()).isEqualTo(1);
        // Un proyecto que no existe: 404.
        mvc.perform(multipart("/api/v1/proyectos/no-existe/lotes/carga/vista-previa").file(f)
                .header("Authorization", gestor())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("La plantilla trae las nueve columnas y se puede volver a cargar tal cual")
    void plantilla() throws Exception {
        String r = mvc.perform(get(BASE + "/plantilla.csv").header("Authorization", token("asesor-01")))
                .andExpect(status().isOk()).andExpect(header().string("Content-Disposition", containsString("plantilla-lotes.csv")))
                .andExpect(content().contentTypeCompatibleWith("text/csv")).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        assertThat(r).startsWith("manzana,lote,area_m2,precio,moneda,estado,independizacion,zonificacion,codigo_caso");
        JsonNode v = vista(r);
        assertThat(v.get("valida").asBoolean()).isTrue();
        assertThat(v.get("nuevas").asInt()).isEqualTo(1);
    }

    // ------------------------------------------------------------------ kit de la demostración

    @Test
    @DisplayName("Kit: proyecto-nuevo-80-lotes.csv — la vista previa no guarda nada y la confirmación crea los 80 lotes")
    void kitNuevoProyecto() throws Exception {
        String asesor = token("asesor-01");
        int evaluaciones = historialEvaluaciones();
        JsonNode antes = leerComo(MATRIZ_AQUIJES, asesor).get("evaluacion");
        int catalogo = json(mvc.perform(get("/api/v1/publico/inmuebles"))).get("total").asInt();
        mvc.perform(get("/api/v1/publico/proyectos/" + AQUIJES)).andExpect(status().isNotFound()); // aún sin lotes

        JsonNode v = json(previa(csv(kit("proyecto-nuevo-80-lotes.csv")), asesor).andExpect(status().isOk()));
        assertThat(v.get("valida").asBoolean()).isTrue();
        assertThat(v.get("totalFilas").asInt()).isEqualTo(80);
        assertThat(v.get("nuevas").asInt()).isEqualTo(80);
        assertThat(v.get("conErrores").asInt()).isZero();
        assertThat(v.get("erroresGenerales")).isEmpty();
        assertThat(v.get("filas").get(0).get("fila").asInt()).isEqualTo(2);
        assertThat(lotes()).as("la vista previa no escribe").isZero();
        assertThat(historialLotes()).isZero();

        confirmar(csv(kit("proyecto-nuevo-80-lotes.csv")), asesor).andExpect(status().isOk())
                .andExpect(jsonPath("$.creados").value(80)).andExpect(jsonPath("$.actualizados").value(0))
                .andExpect(jsonPath("$.cargaId").isNotEmpty());
        assertThat(lotes()).isEqualTo(80);
        assertThat(historialLotes()).isEqualTo(80);
        // 60 % disponibles, 25 % separados y 15 % vendidos, y ya se ve en el portal sin sesión.
        mvc.perform(get("/api/v1/publico/proyectos/" + AQUIJES)).andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes", hasSize(80)))
                .andExpect(jsonPath("$.conteo.disponibles").value(48)).andExpect(jsonPath("$.conteo.separados").value(20))
                .andExpect(jsonPath("$.conteo.vendidos").value(12))
                .andExpect(jsonPath("$.lotes[?(@.publicado == false)]", hasSize(0)))
                .andExpect(jsonPath("$.indicadorA.evaluacion.estado").value("VERDE"));
        assertThat(json(mvc.perform(get("/api/v1/publico/inmuebles"))).get("total").asInt()).isEqualTo(catalogo + 80);
        // Cargar lotes no recalcula nada: el indicador A de la partida matriz sigue igual.
        assertThat(historialEvaluaciones()).isEqualTo(evaluaciones);
        assertThat(leerComo(MATRIZ_AQUIJES, asesor).get("evaluacion")).isEqualTo(antes);
        // Volver a cargar el mismo archivo no cambia nada.
        confirmar(csv(kit("proyecto-nuevo-80-lotes.csv")), asesor).andExpect(status().isOk())
                .andExpect(jsonPath("$.creados").value(0)).andExpect(jsonPath("$.actualizados").value(0))
                .andExpect(jsonPath("$.sinCambios").value(80));
        assertThat(historialLotes()).isEqualTo(80);
    }

    @Test
    @DisplayName("Kit: proyecto-con-errores.csv — tres filas malas (área negativa, estado inválido, lote duplicado) y nada se guarda")
    void kitConErrores() throws Exception {
        String asesor = token("asesor-01");
        JsonNode v = json(previa(csv(kit("proyecto-con-errores.csv")), asesor).andExpect(status().isOk()));
        assertThat(v.get("valida").asBoolean()).isFalse();
        assertThat(v.get("totalFilas").asInt()).isEqualTo(11);
        assertThat(v.get("conErrores").asInt()).isEqualTo(3);
        assertThat(v.get("nuevas").asInt()).isEqualTo(8);
        assertThat(errores(v, 8)).contains("area_m2").contains("negativo");
        assertThat(errores(v, 10)).contains("estado").contains("RESERVADO").contains("DISPONIBLE, SEPARADO, VENDIDO");
        assertThat(errores(v, 12)).contains("A-3").contains("fila 4");
        for (JsonNode f : v.get("filas")) {
            boolean mala = List.of(8, 10, 12).contains(f.get("fila").asInt());
            assertThat(f.get("accion").asString()).as("fila " + f.get("fila")).isEqualTo(mala ? "ERROR" : "NUEVO");
            assertThat(f.get("errores").isEmpty()).isEqualTo(!mala);
        }
        // Confirmar un archivo con errores: 422, todo o nada.
        confirmar(csv(kit("proyecto-con-errores.csv")), asesor).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value(containsString("3 fila(s) con errores")))
                .andExpect(jsonPath("$.detail").value(containsString("no se guardó nada")));
        assertThat(lotes()).isZero();
        assertThat(historialLotes()).isZero();
    }

    // ------------------------------------------------------------------ filas válidas e inválidas

    @Test
    @DisplayName("Cada campo inválido da su propio error en su fila, y los válidos siguen marcados como nuevos")
    void filasInvalidas() throws Exception {
        String archivo = CABECERA
                + "A,1,140,35000,PEN,DISPONIBLE,PARTIDA_PROPIA,RDM,\r\n"          // 2 válida
                + ",2,140,,,,,,\r\n"                                                // 3 manzana vacía
                + "ABCDE,3,140,,,,,,\r\n"                                           // 4 manzana larga
                + "A,0,140,,,,,,\r\n"                                               // 5 lote 0
                + "A,uno,140,,,,,,\r\n"                                             // 6 lote no numérico
                + "A,7,,,,,,,\r\n"                                                  // 7 sin área
                + "A,8,cero,,,,,,\r\n"                                              // 8 área no numérica
                + "A,9,0,,,,,,\r\n"                                                 // 9 área 0
                + "A,10,140.555,,,,,,\r\n"                                          // 10 tres decimales
                + "A,11,140.005,35000,,,,,\r\n"                                       // 11 tres decimales significativos
                + "A,12,140,-5,,,,,\r\n"                                            // 12 precio negativo
                + "A,13,140,abc,,,,,\r\n"                                           // 13 precio no numérico
                + "A,14,140,35000,EUR,,,,\r\n"                                      // 14 moneda
                + "A,15,140,,,,,RESIDENCIAL-DE-DENSIDAD-MEDIA-ALTA,\r\n"            // 15 zonificación larga
                + "A,16,140,,,,CASI,,\r\n"                                          // 16 independización
                + "A,17,140,,,,,,99999999\r\n"                                      // 17 caso inexistente
                + "A,18,140,,,,,," + MATRIZ_AQUIJES + "\r\n"                        // 18 partida matriz
                + "A,19,140,,,,,,11081204\r\n"                                      // 19 caso de otro proyecto
                + "A,20,140,35000,usd,separado,en partida matriz,cv,\r\n"           // 20 válida con minúsculas
                + "A,21,140,35000,PEN,DISPONIBLE,,RDM,,sobra\r\n";                  // 21 columna de más
        JsonNode v = vista(archivo);
        assertThat(v.get("valida").asBoolean()).isFalse();
        assertThat(v.get("totalFilas").asInt()).isEqualTo(20);
        String[][] esperado = {{"3", "manzana"}, {"4", "manzana"}, {"5", "lote"}, {"6", "lote"}, {"7", "area_m2"},
                {"8", "area_m2"}, {"9", "area_m2"}, {"10", "2 decimales"}, {"11", "2 decimales"}, {"12", "precio"},
                {"13", "precio"}, {"14", "moneda"}, {"15", "zonificacion"}, {"16", "independizacion"},
                {"17", "no existe"}, {"18", "partida matriz"}, {"19", "campina-del-olivar"}, {"21", "más columnas"}};
        for (String[] e : esperado) assertThat(errores(v, Integer.parseInt(e[0]))).as("fila " + e[0]).contains(e[1]);
        assertThat(v.get("conErrores").asInt()).isEqualTo(esperado.length);
        assertThat(v.get("nuevas").asInt()).isEqualTo(2);
        for (int ok : new int[] {2, 20}) assertThat(errores(v, ok)).isEqualTo("[]");
        // Las minúsculas y las etiquetas con espacios se aceptan.
        for (JsonNode f : v.get("filas")) {
            if (f.get("fila").asInt() == 20) assertThat(f.get("cambios").toString()).contains("moneda: USD", "estado: SEPARADO",
                    "independizacion: EN_PARTIDA_MATRIZ", "zonificacion: cv");
        }
        // No se puede confirmar.
        confirmar(csv(archivo), gestor()).andExpect(status().isUnprocessableContent());
        assertThat(lotes()).isZero();
    }

    @Test
    @DisplayName("Un lote repetido en el archivo es un error en la segunda fila; manzana en minúscula es la misma manzana")
    void lotesDuplicados() throws Exception {
        JsonNode v = vista(CABECERA + "a,1,140,,,,,,\r\nA,1,150,,,,,,\r\nA,2,140,,,,,,\r\nB,1,140,,,,,,\r\nb,1,140,,,,,,\r\n");
        assertThat(v.get("conErrores").asInt()).isEqualTo(2);
        assertThat(errores(v, 3)).contains("A-1").contains("fila 2");
        assertThat(errores(v, 6)).contains("B-1").contains("fila 5");
        assertThat(errores(v, 2)).isEqualTo("[]");
        assertThat(v.get("valida").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("Actualizar un lote existente: se ve en la vista previa, se aplica y queda en el historial; una celda vacía deja el valor")
    void actualizaYQuedaEnElHistorial() throws Exception {
        String asesor = token("asesor-01");
        confirmar(csv(CABECERA + "A,1,140.00,35000,PEN,DISPONIBLE,EN_PARTIDA_MATRIZ,RDM,\r\nA,2,150.00,37500,PEN,SEPARADO,EN_PARTIDA_MATRIZ,CV,\r\n"),
                asesor).andExpect(status().isOk());

        String segundo = CABECERA
                + "A,1,140.00,36000,,VENDIDO,,,\r\n"                       // cambia precio y estado; lo vacío se conserva
                + "A,2,150.00,37500,PEN,SEPARADO,EN_PARTIDA_MATRIZ,CV,\r\n" // idéntica: sin cambios
                + "A,3,160.00,40000,PEN,DISPONIBLE,PARTIDA_PROPIA,RDM,\r\n"; // nueva
        JsonNode v = vista(segundo);
        assertThat(v.get("valida").asBoolean()).isTrue();
        assertThat(v.get("nuevas").asInt()).isEqualTo(1);
        assertThat(v.get("actualizadas").asInt()).isEqualTo(1);
        assertThat(v.get("sinCambios").asInt()).isEqualTo(1);
        JsonNode a1 = v.get("filas").get(0);
        assertThat(a1.get("accion").asString()).isEqualTo("ACTUALIZA");
        assertThat(a1.get("cambios").toString()).contains("precio: 35000.00 → 36000.00", "estado: DISPONIBLE → VENDIDO")
                .doesNotContain("area_m2").doesNotContain("zonificacion");
        assertThat(v.get("filas").get(1).get("accion").asString()).isEqualTo("SIN_CAMBIOS");
        assertThat(lotes()).as("la vista previa no escribe").isEqualTo(2);

        confirmar(csv(segundo), asesor).andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(1))
                .andExpect(jsonPath("$.actualizados").value(1)).andExpect(jsonPath("$.sinCambios").value(1));
        assertThat(lotes()).isEqualTo(3);
        assertThat(dato("l.precio", "A", 1, java.math.BigDecimal.class)).isEqualByComparingTo("36000");
        assertThat(dato("l.moneda", "A", 1, String.class)).isEqualTo("PEN");
        assertThat(dato("l.estado_comercial", "A", 1, String.class)).isEqualTo("VENDIDO");
        assertThat(dato("l.zonificacion", "A", 1, String.class)).isEqualTo("RDM");

        // Historial del lote: creado y actualizado, con quién y qué cambió; el lote sin cambios no suma filas.
        mvc.perform(get(BASE + "/A-1/historial").header("Authorization", revisor())).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].accion").value("CREADO")).andExpect(jsonPath("$[0].origen").value("CSV"))
                .andExpect(jsonPath("$[1].accion").value("ACTUALIZADO"))
                .andExpect(jsonPath("$[1].cambios").value(containsString("precio: 35000.00 → 36000.00")))
                .andExpect(jsonPath("$[1].cuentaCodigo").value("asesor-01"))
                .andExpect(jsonPath("$[1].registradaEn").isNotEmpty());
        mvc.perform(get(BASE + "/A-2/historial").header("Authorization", revisor())).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get(BASE + "/a-3/historial").header("Authorization", gestor())).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get(BASE + "/A-1/historial").header("Authorization", comprador())).andExpect(status().isForbidden());
        mvc.perform(get(BASE + "/A-1/historial")).andExpect(status().isUnauthorized());
        // Las filas de una misma carga comparten su identificador.
        assertThat(jdbc.queryForList("select distinct carga_id from historial_lote_proyecto where cuenta_codigo = 'asesor-01' "
                + "and cambios like '%36000%'", String.class)).hasSize(1);
    }

    @Test
    @DisplayName("Con codigo_caso el lote queda vinculado a su caso, cuyo estado comercial es el vigente; no se repite en otro lote")
    void vinculaUnCaso() throws Exception {
        String asesor = token("asesor-01");
        // SUPE es un lote de la SBN, sin proyecto: se puede vincular.
        confirmar(csv(CABECERA + "A,1,140,35000,PEN,DISPONIBLE,,,\r\nA,2,150,,,SEPARADO,,," + SUPE + "\r\n"), asesor)
                .andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(2));
        assertThat(dato("l.caso_codigo", "A", 2, String.class)).isEqualTo(SUPE);
        assertThat(jdbc.queryForObject("select estado_comercial from caso_lote where codigo = ?", String.class, SUPE))
                .isEqualTo("SEPARADO");
        // No se puede usar el mismo caso en otra fila del archivo ni en otro lote.
        JsonNode otra = vista(CABECERA + "A,3,150,,,,,," + SUPE + "\r\n");
        assertThat(errores(otra, 2)).contains("ya es el caso del lote A-2");
        JsonNode repetido = vista(CABECERA + "B,1,150,,,,,," + HUARMEY + "\r\nB,2,150,,,,,," + HUARMEY + "\r\n");
        assertThat(errores(repetido, 3)).contains("aparece en otra fila");
        // Actualizar el mismo lote con su mismo caso es válido (no choca consigo mismo).
        assertThat(vista(CABECERA + "A,2,150,,,VENDIDO,,," + SUPE + "\r\n").get("valida").asBoolean()).isTrue();
        confirmar(csv(CABECERA + "A,2,150,,,VENDIDO,,," + SUPE + "\r\n"), asesor).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select estado_comercial from caso_lote where codigo = ?", String.class, SUPE))
                .isEqualTo("VENDIDO");
        // En el plano, el estado del lote es el de su caso.
    }

    @Test
    @DisplayName("Sin autorización vigente de la partida matriz, los lotes cargados no se publican (I14)")
    void sinAutorizacionNoSePublica() throws Exception {
        String asesor = token("asesor-01");
        mvc.perform(delete("/api/v1/casos/" + MATRIZ_AQUIJES + "/autorizacion").header("Authorization", asesor))
                .andExpect(status().isOk());
        confirmar(csv(CABECERA + "A,1,140,35000,PEN,DISPONIBLE,,,\r\n"), asesor).andExpect(status().isOk());
        assertThat(dato("l.publicado", "A", 1, Boolean.class)).isFalse();
        mvc.perform(get("/api/v1/publico/proyectos/" + AQUIJES)).andExpect(status().isNotFound());
        assertThat(json(mvc.perform(get("/api/v1/publico/inmuebles").param("proyecto", "Horizonte de Los Aquijes")))
                .get("total").asInt()).isZero();
    }

    // ------------------------------------------------------------------ formato del archivo

    @Test
    @DisplayName("Acepta punto y coma con coma decimal (Excel en español), BOM, comillas y Windows-1252")
    void formatosDeExcel() throws Exception {
        String excel = "﻿manzana;lote;area_m2;precio;moneda;estado;independizacion;zonificacion;codigo_caso\r\n"
                + "A;1;140,5;35125;PEN;Disponible;;\"RDM\";\r\n"
                + "\"B\";2;\"150,25\";;;;;\"R;DM\";\r\n";
        JsonNode v = vista(excel);
        assertThat(v.get("valida").asBoolean()).as(v.toString()).isTrue();
        assertThat(v.get("filas").get(0).get("cambios").toString()).contains("area_m2: 140.50", "estado: DISPONIBLE");
        assertThat(v.get("filas").get(1).get("cambios").toString()).contains("area_m2: 150.25", "zonificacion: R;DM");
        // Una zonificación con tilde guardada como Windows-1252 se lee bien.
        byte[] ansi = (CABECERA + "A,1,140,,,,,Comercio vecinal ñ,\r\n").getBytes(Charset.forName("windows-1252"));
        JsonNode w = json(previa(csv(ansi), gestor()).andExpect(status().isOk()));
        assertThat(w.get("filas").get(0).get("cambios").toString()).contains("zonificacion: Comercio vecinal ñ");
        confirmar(csv(ansi), gestor()).andExpect(status().isOk());
        assertThat(dato("l.zonificacion", "A", 1, String.class)).isEqualTo("Comercio vecinal ñ");
    }

    @Test
    @DisplayName("Un encabezado mal hecho, un archivo vacío o con comillas sin cerrar se rechazan como un todo")
    void encabezadoYFormato() throws Exception {
        String[][] casos = {
                {"manzana,lote\r\nA,1\r\n", "Falta la columna obligatoria «area_m2»"},
                {"manzana,lote,area_m2,color\r\nA,1,140,rojo\r\n", "La columna «color» no existe"},
                {"manzana,lote,area_m2,lote\r\nA,1,140,2\r\n", "«lote» está repetida"},
                {CABECERA, "no tiene filas de datos"},
                {"", "está vacío"},
                {"\r\n\r\n", "está vacío"},
                {CABECERA + "A,1,\"140,35000\r\n", "comillas sin cerrar"}};
        for (String[] c : casos) {
            JsonNode v = vista(c[0]);
            assertThat(v.get("valida").asBoolean()).as(c[1]).isFalse();
            assertThat(v.get("erroresGenerales").toString()).as(c[1]).contains(c[1]);
            confirmar(csv(c[0]), gestor()).andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.detail").value(containsString("se guardó nada")));
        }
        assertThat(lotes()).isZero();
        // Sin el campo «archivo», 400 (no 500).
        mvc.perform(multipart(BASE + "/carga/vista-previa").header("Authorization", gestor())).andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------ límites

    static String filasValidas(int n) {
        StringBuilder b = new StringBuilder(CABECERA);
        for (int i = 0; i < n; i++) {
            b.append("M").append(i / 500).append(',').append(i % 500 + 1).append(",140.00,35000,PEN,DISPONIBLE,,RDM,\r\n");
        }
        return b.toString();
    }

    @Test
    @DisplayName("Límite de filas: 2000 se aceptan y se guardan; 2001 se rechazan sin leer una sola")
    void limiteDeFilas() throws Exception {
        JsonNode v = vista(filasValidas(2000));
        assertThat(v.get("valida").asBoolean()).isTrue();
        assertThat(v.get("nuevas").asInt()).isEqualTo(2000);
        confirmar(csv(filasValidas(2000)), gestor()).andExpect(status().isOk()).andExpect(jsonPath("$.creados").value(2000));
        assertThat(lotes()).isEqualTo(2000);
        assertThat(historialLotes()).isEqualTo(2000);
        dejarVacio();

        JsonNode demasiadas = vista(filasValidas(2001));
        assertThat(demasiadas.get("valida").asBoolean()).isFalse();
        assertThat(demasiadas.get("erroresGenerales").toString()).contains("2001 filas").contains("máximo es 2000");
        assertThat(demasiadas.get("filas")).isEmpty();
        confirmar(csv(filasValidas(2001)), gestor()).andExpect(status().isUnprocessableContent());
        assertThat(lotes()).isZero();
    }

    @Test
    @DisplayName("Límite de tamaño: más de 1 MB da 413 y no guarda nada")
    void limiteDeTamano() throws Exception {
        StringBuilder grande = new StringBuilder(CABECERA).append("A,1,140,,,,,,\r\n");
        while (grande.length() < 1024 * 1024 + 10) grande.append("# relleno ").append("x".repeat(200)).append("\r\n");
        byte[] bytes = grande.toString().getBytes(StandardCharsets.UTF_8);
        assertThat(bytes.length).isGreaterThan(1024 * 1024);
        previa(csv(bytes), gestor()).andExpect(status().isContentTooLarge()).andExpect(jsonPath("$.detail").value(containsString("MB")));
        confirmar(csv(bytes), gestor()).andExpect(status().isContentTooLarge());
        assertThat(lotes()).isZero();
        // Justo en el límite sí se lee (aunque tenga errores de contenido).
        byte[] enElLimite = new byte[1024 * 1024];
        java.util.Arrays.fill(enElLimite, (byte) ' ');
        previa(csv(enElLimite), gestor()).andExpect(status().isOk());
    }
}
