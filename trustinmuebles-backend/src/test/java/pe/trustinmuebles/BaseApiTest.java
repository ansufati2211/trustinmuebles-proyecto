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
 * Base de las pruebas de integración: H2 en memoria con el contenido v0.5 ya cargado y las cuentas de prueba.
 * Las pruebas que modifican un caso lo restauran al terminar, así que el orden de ejecución no importa.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseApiTest {
    /** Partida de Parcona: sin alertas, hipoteca cancelada. Debe dar VERDE. */
    protected static final String PARCONA = "11048217";
    /** Partida de La Tinguiña: copropiedad e hipoteca vigente, embargo cancelado. Debe dar AMARILLO. */
    protected static final String TINGUINA = "11052690";
    /** Partida de Subtanjalla: extracto parcial con una anotación de demanda vigente. Debe dar GRIS. */
    protected static final String SUBTANJALLA = "11061555";
    /** Los Aquijes: sin copia literal ni asientos. Debe dar GRIS. */
    protected static final String LOS_AQUIJES = "11070419";
    /** Casos 5 a 10 (v0.4). */
    protected static final String PUEBLO_NUEVO = "11075836";
    protected static final String SANTIAGO = "11081204";
    protected static final String SALAS = "11087751";
    protected static final String MOLINOS = "11093320";
    protected static final String PACHACUTEC = "11098467";
    protected static final String ICA = "11104029";
    /**
     * v0.9: lotes reales de la II Subasta Pública 2026 de la SBN, de la cuenta propietario-03. Partida por transcribir y
     * sin memoria descriptiva: deben dar GRIS y conservar la alerta de zonificación (RV-07).
     */
    protected static final String HUARMEY = "11045763";
    protected static final String SUPE = "80194645";
    /** Los diez casos de demostración (sintéticos), sin los dos lotes de la SBN. */
    protected static final String[] DEMOSTRACION = {PARCONA, TINGUINA, SUBTANJALLA, LOS_AQUIJES, PUEBLO_NUEVO, SANTIAGO,
            SALAS, MOLINOS, PACHACUTEC, ICA};

    /**
     * v1.0 (etapas 3a y 3b): partidas matrices de los cuatro proyectos precargados. Son de la inmobiliaria, quedan en borrador
     * (no se ofrecen como inmuebles) y tienen su autorización registrada: sus lotes sin caso propio se publican con ella.
     */
    protected static final String MATRIZ_VENTISCA = "11112001";
    protected static final String MATRIZ_LUCUMO = "11112002";
    protected static final String MATRIZ_SAUZAL = "11112003";
    /** Etapa 3b: la matriz del cuarto proyecto, que empieza sin lotes (se cargan desde un CSV). */
    protected static final String MATRIZ_AQUIJES = "11112004";
    protected static final String[] MATRICES = {MATRIZ_VENTISCA, MATRIZ_LUCUMO, MATRIZ_SAUZAL, MATRIZ_AQUIJES};
    /** Casos de la carga: los 12 de siempre (10 de demostración y 2 de la SBN) más las 4 partidas matrices. */
    protected static final int CASOS_CARGA = 16;

    /**
     * v1.0 (etapa 3a): cuántos inmuebles ofrece el catálogo público, contados en la base: los casos publicados más los
     * lotes de proyecto publicados, sin caso propio y con la partida matriz de su proyecto autorizada.
     */
    protected int ofrecidosEnCatalogo() {
        return jdbc.queryForObject("select count(*) from caso_lote where estado_publicacion = 'PUBLICADO'", Integer.class)
                + jdbc.queryForObject("select count(*) from lote_proyecto l join proyecto p on p.id = l.proyecto_id "
                        + "join caso_lote m on m.codigo = p.caso_matriz_codigo where l.publicado = true "
                        + "and l.caso_codigo is null and m.autorizacion_fecha is not null", Integer.class);
    }

    /** Los códigos dados seguidos de las tres partidas matrices. */
    protected static String[] conMatrices(String... codigos) {
        String[] todos = java.util.Arrays.copyOf(codigos, codigos.length + MATRICES.length);
        System.arraycopy(MATRICES, 0, todos, codigos.length, MATRICES.length);
        return todos;
    }

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

    /**
     * v0.7: comprador, revisor, especialista-01, gestor-01, propietario-01, propietario-02 y especialista-02. v0.9:
     * propietario-03 (lotes de la subasta de la SBN). v1.0: asesor-01.
     */
    protected static final int CUENTAS_DEMO = 9;

    protected String gestor() throws Exception {
        return token("gestor-01");
    }

    protected String propietario(int n) throws Exception {
        return token("propietario-0" + n);
    }

    protected JsonNode leer(String codigo) throws Exception {
        return leerComo(codigo, comprador());
    }

    /** Lee un caso con otra sesión: un caso en borrador no es visible para el comprador (v0.7). */
    protected JsonNode leerComo(String codigo, String authorization) throws Exception {
        String r = mvc.perform(get("/api/v1/casos/" + codigo).header("Authorization", authorization))
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
        p.put("completitud", e.get("completitud").asString());
        p.put("fechaReferencial", e.get("fechaReferencial").asString());
        for (String campo : new String[] {"nota", "zonaRegistral", "oficinaRegistral", "ubicacion", "linderos",
                "antecedenteDominial"}) {
            if (e.hasNonNull(campo)) p.put(campo, e.get(campo).asString());
        }
        if (e.hasNonNull("areaM2")) p.put("areaM2", e.get("areaM2").decimalValue());
        var asientos = p.putArray("asientos");
        for (JsonNode a : e.get("asientos")) {
            ObjectNode n = asientos.addObject();
            n.put("referencia", a.get("referencia").asString());
            n.put("tipoActo", a.get("tipoActo").asString());
            for (String campo : new String[] {"estado", "fechaInscripcion", "tituloNumero", "fechaPresentacion", "texto",
                    "canceloNumero", "titulares", "acreedor", "plazoOVencimiento"}) {
                if (a.hasNonNull(campo)) n.put(campo, a.get(campo).asString());
            }
        }
        // Bloque técnico: se reenvía tal cual para que restaurar un caso no borre sus planos.
        p.put("tipoPredio", e.get("tipoPredio").asString());
        if (e.hasNonNull("areaConstruidaInscrita")) p.put("areaConstruidaInscrita", e.get("areaConstruidaInscrita").decimalValue());
        var planos = p.putArray("planos");
        for (JsonNode pl : e.get("planos")) {
            ObjectNode n = planos.addObject();
            n.put("especialidad", pl.get("especialidad").asString());
            n.put("estado", pl.get("estado").asString());
            for (String campo : new String[] {"sistemaConstructivo", "observacion"}) {
                if (pl.hasNonNull(campo)) n.put(campo, pl.get(campo).asString());
            }
            if (pl.hasNonNull("areaConstruida")) n.put("areaConstruida", pl.get("areaConstruida").decimalValue());
        }
        // v0.9: documentos del lote, también tal cual (en una vivienda la lista viene vacía).
        if (e.has("documentosLote") && !e.get("documentosLote").isEmpty()) {
            var docs = p.putArray("documentosLote");
            for (JsonNode d : e.get("documentosLote")) {
                ObjectNode n = docs.addObject();
                n.put("tipo", d.get("tipo").asString());
                n.put("estado", d.get("estado").asString());
                if (d.hasNonNull("observacion")) n.put("observacion", d.get("observacion").asString());
            }
        }
        p.put("versionEsperada", e.get("version").asLong());
        return p;
    }

    /** Agrega un asiento a una petición ya construida. */
    protected ObjectNode agregarAsiento(ObjectNode peticion, String referencia, String tipoActo, String estado,
            String texto, String canceloNumero) {
        ObjectNode n = ((tools.jackson.databind.node.ArrayNode) peticion.get("asientos")).addObject();
        n.put("referencia", referencia);
        n.put("tipoActo", tipoActo);
        if (estado != null) n.put("estado", estado);
        if (texto != null) n.put("texto", texto);
        if (canceloNumero != null) n.put("canceloNumero", canceloNumero);
        return n;
    }

    /** v0.8: un PDF real de una página para subir como documento o plano (los planos presentados exigen su archivo). */
    protected static org.springframework.mock.web.MockMultipartFile pdf(String texto) {
        return new org.springframework.mock.web.MockMultipartFile("documento", "prueba.pdf", "application/pdf",
                PdfDePrueba.simple(texto));
    }

    /** v0.8: sube el PDF de un plano; si estaba no presentado, queda presentado y se recalcula (PLANO_ADJUNTO). */
    protected ResultActions subirPlano(String codigo, String especialidad, String authorization) throws Exception {
        return mvc.perform(multipart("/api/v1/casos/" + codigo + "/planos/" + especialidad + "/documento")
                .file(pdf("Plano " + especialidad + " de prueba")).header("Authorization", authorization));
    }

    /** Devuelve el caso a su contenido original usando la versión actual. */
    protected void restaurar(String codigo, JsonNode original) throws Exception {
        ObjectNode p = peticion(original);
        p.put("versionEsperada", leer(codigo).get("expediente").get("version").asLong());
        actualizarExpediente(codigo, revisor(), p).andExpect(status().isOk());
    }
}
