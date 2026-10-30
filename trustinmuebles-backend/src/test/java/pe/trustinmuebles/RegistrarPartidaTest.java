package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Partidas transcritas de una consulta pública: registro, protección de datos personales y eliminación. */
class RegistrarPartidaTest extends BaseApiTest {
    static final String NUMERO = "99999999";
    static final String SIMULADA = "SIM-99999999";

    /** Petición válida: una empresa como titular, una hipoteca vigente y nada de datos personales. */
    ObjectNode partida(String numero) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "TRANSCRITA_CONOCE_AQUI");
        p.put("numero", numero);
        p.put("denominacion", "Mz. D Lote 5 · Hab. Urb. Los Sauces · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-10-17");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        p.put("zonaRegistral", "Zona Registral N.° XI - Sede Ica");
        p.put("oficinaRegistral", "Oficina Registral de Ica");
        p.put("ubicacion", "Mz. D, Lote 5, distrito de Ica.");
        p.put("areaM2", 150.00);
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Inmobiliaria Los Sauces S.A.C. adquirió el predio por compraventa.");
        c.put("titulares", "Inmobiliaria Los Sauces S.A.C. (100 %)");
        ObjectNode d = a.addObject();
        d.put("referencia", "D00001");
        d.put("tipoActo", "HIPOTECA");
        d.put("estado", "VIGENTE");
        d.put("texto", "Hipoteca a favor de Persona natural 1, en garantía de un préstamo.");
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-01"); // v0.7: el revisor indica el propietario al crear el expediente
        return p;
    }

    ResultActions registrar(ObjectNode cuerpo, String autorizacion) throws Exception {
        return mvc.perform(post("/api/v1/casos").header("Authorization", autorizacion)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)));
    }

    void borrar(String numero) throws Exception {
        mvc.perform(delete("/api/v1/casos/" + numero).header("Authorization", revisor()));
    }

    @Test
    @DisplayName("El revisor registra una partida transcrita: queda evaluada, con checklist, glosario y PDF de transcripción")
    void revisorRegistra() throws Exception {
        try {
            registrar(partida(NUMERO), revisor()).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.codigo").value(NUMERO))
                    .andExpect(jsonPath("$.origen").value("TRANSCRITA"))
                    .andExpect(jsonPath("$.sintetico").value(false))
                    .andExpect(jsonPath("$.fuente").value("Conoce Aquí – SUNARP"))
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"))
                    .andExpect(jsonPath("$.checklist", hasSize(3)))
                    .andExpect(jsonPath("$.terminos", not(empty())))
                    .andExpect(jsonPath("$.expediente.tieneDocumento").value(true));

            // v0.7: nace en borrador; el comprador la ve cuando el propietario autoriza y el gestor publica.
            mvc.perform(put("/api/v1/casos/" + NUMERO + "/autorizacion").header("Authorization", propietario(1)))
                    .andExpect(status().isOk());
            mvc.perform(post("/api/v1/casos/" + NUMERO + "/publicacion").header("Authorization", gestor()))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/v1/casos").header("Authorization", comprador())).andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.codigo=='" + NUMERO + "')].origen", contains("TRANSCRITA")));

            byte[] pdf = mvc.perform(get("/api/v1/casos/" + NUMERO + "/documento").header("Authorization", comprador()))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
            try (PDDocument doc = Loader.loadPDF(pdf)) {
                String texto = new PDFTextStripper().getText(doc);
                assertThat(texto).contains("TRANSCRIPCIÓN REFERENCIAL DE PARTIDA REGISTRAL", "Conoce Aquí",
                        "omite los nombres de personas naturales", "Inmobiliaria Los Sauces S.A.C.");
                assertThat(texto).doesNotContain("SIMULADA", "documento simulado");
            }
        } finally {
            borrar(NUMERO);
        }
    }

    @Test
    @DisplayName("Solo el revisor registra o elimina; sin sesión da 401")
    void permisos() throws Exception {
        registrar(partida(NUMERO), comprador()).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/casos/" + PARCONA).header("Authorization", comprador()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Una partida repetida da 409 y no se duplica")
    void repetida() throws Exception {
        try {
            registrar(partida(NUMERO), revisor()).andExpect(status().isCreated());
            registrar(partida(NUMERO), revisor()).andExpect(status().isConflict());
        } finally {
            borrar(NUMERO);
        }
    }

    @Test
    @DisplayName("Número inválido, prefijo SIM-, sin confirmación o con datos personales dan 400 y no guardan nada")
    void entradasInvalidas() throws Exception {
        ObjectNode sim = partida("SIM-11099999");
        registrar(sim, revisor()).andExpect(status().isBadRequest());
        ObjectNode corto = partida("1234");
        registrar(corto, revisor()).andExpect(status().isBadRequest());
        ObjectNode sinConfirmar = partida(NUMERO);
        sinConfirmar.put("confirmaSinDatosPersonales", false);
        registrar(sinConfirmar, revisor()).andExpect(status().isBadRequest());

        for (String texto : new String[] {"Titular identificado con DNI 45678912.", "Titular con D.N.I. N° 45678912",
                "de estado civil soltera", "con domicilio en Av. Los Álamos 123, Ica"}) {
            ObjectNode p = partida(NUMERO);
            ((ObjectNode) ((ArrayNode) p.get("asientos")).get(0)).put("texto", texto);
            registrar(p, revisor()).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/v1/casos/" + NUMERO).header("Authorization", comprador())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Editar una partida transcrita también rechaza datos personales")
    void edicionProtegida() throws Exception {
        try {
            registrar(partida(NUMERO), revisor()).andExpect(status().isCreated());
            ObjectNode p = peticion(leerComo(NUMERO, revisor())); // v0.7: en borrador solo la ve el equipo
            ((ObjectNode) ((ArrayNode) p.get("asientos")).get(0)).put("texto", "Titular con DNI 12345678");
            actualizarExpediente(NUMERO, revisor(), p).andExpect(status().isBadRequest());
        } finally {
            borrar(NUMERO);
        }
    }

    // ------------------------------------------------------- origen y precio (B6)

    ObjectNode simulada() {
        ObjectNode p = partida(SIMULADA);
        p.put("origen", "SIMULADA_DEMOSTRACION");
        return p;
    }

    @Test
    @DisplayName("El origen es obligatorio y cerrado: sin él, o con un valor desconocido, da 400 y no guarda nada")
    void origenObligatorio() throws Exception {
        ObjectNode sinOrigen = partida(NUMERO);
        sinOrigen.remove("origen");
        registrar(sinOrigen, revisor()).andExpect(status().isBadRequest());
        ObjectNode desconocido = partida(NUMERO);
        desconocido.put("origen", "OTRA_FUENTE");
        registrar(desconocido, revisor()).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo = ?", Integer.class, NUMERO)).isZero();
    }

    @Test
    @DisplayName("El prefijo debe corresponder al origen: SIM- con transcrita y un número sin SIM- con simulada dan 400")
    void prefijoSegunElOrigen() throws Exception {
        registrar(partida(SIMULADA), revisor()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("se reserva a las partidas simuladas")));
        ObjectNode sinPrefijo = simulada();
        sinPrefijo.put("numero", NUMERO);
        registrar(sinPrefijo, revisor()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("debe llevar el prefijo SIM-")));
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo in (?, ?)", Integer.class, NUMERO,
                SIMULADA)).isZero();
    }

    @Test
    @DisplayName("Una partida simulada queda sintética y rotulada, con su PDF simulado; las dos protegen los datos personales")
    void simuladaRegistrada() throws Exception {
        try {
            registrar(simulada(), revisor()).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.codigo").value(SIMULADA))
                    .andExpect(jsonPath("$.origen").value("SINTETICO"))
                    .andExpect(jsonPath("$.sintetico").value(true))
                    .andExpect(jsonPath("$.fuente").value("Partida simulada para demostración"))
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"));
            byte[] pdf = mvc.perform(get("/api/v1/casos/" + SIMULADA + "/documento").header("Authorization", revisor()))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
            try (PDDocument doc = Loader.loadPDF(pdf)) {
                assertThat(new PDFTextStripper().getText(doc)).contains("SIMULADA").doesNotContain("Conoce Aquí");
            }
            ObjectNode edicion = peticion(leerComo(SIMULADA, revisor()));
            ((ObjectNode) ((ArrayNode) edicion.get("asientos")).get(0)).put("texto", "Titular con DNI 12345678");
            actualizarExpediente(SIMULADA, revisor(), edicion).andExpect(status().isBadRequest());
        } finally {
            borrar(SIMULADA);
        }
        ObjectNode conDni = simulada();
        ((ObjectNode) ((ArrayNode) conDni.get("asientos")).get(0)).put("texto", "Titular con DNI 12345678");
        registrar(conDni, revisor()).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/casos/" + SIMULADA).header("Authorization", revisor())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("El precio referencial es opcional y se muestra en el catálogo y en el detalle, sin alterar el indicador A")
    void precioEnElCatalogo() throws Exception {
        try {
            ObjectNode conPrecio = partida(NUMERO);
            conPrecio.put("precioReferencial", 152500.50);
            registrar(conPrecio, revisor()).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.predio.precioReferencial").value(152500.50))
                    .andExpect(jsonPath("$.predio.moneda").value("PEN"))
                    .andExpect(jsonPath("$.evaluacion.estado").value("AMARILLO"));
            mvc.perform(put("/api/v1/casos/" + NUMERO + "/autorizacion").header("Authorization", propietario(1)))
                    .andExpect(status().isOk());
            mvc.perform(post("/api/v1/casos/" + NUMERO + "/publicacion").header("Authorization", gestor()))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/v1/casos").header("Authorization", comprador()))
                    .andExpect(jsonPath("$[?(@.codigo=='" + NUMERO + "')].predio.precioReferencial", contains(152500.50)));
        } finally {
            borrar(NUMERO);
        }
        try {
            registrar(partida(NUMERO), revisor()).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.predio.precioReferencial").value(nullValue()));
        } finally {
            borrar(NUMERO);
        }
    }

    @Test
    @DisplayName("Un precio cero, negativo, con más de dos decimales o que no es un número da 400 y no guarda nada")
    void precioInvalido() throws Exception {
        for (double precio : new double[] {0, -1, 1000.123}) {
            ObjectNode p = partida(NUMERO);
            p.put("precioReferencial", precio);
            registrar(p, revisor()).andExpect(status().isBadRequest());
        }
        ObjectNode texto = partida(NUMERO);
        texto.put("precioReferencial", "mucho");
        registrar(texto, revisor()).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo = ?", Integer.class, NUMERO)).isZero();
    }

    @Test
    @DisplayName("Eliminar borra una transcrita y su documento; una partida ficticia no se puede eliminar")
    void eliminar() throws Exception {
        registrar(partida(NUMERO), revisor()).andExpect(status().isCreated());
        int antes = jdbc.queryForObject("select count(*) from archivo", Integer.class);
        mvc.perform(delete("/api/v1/casos/" + NUMERO).header("Authorization", revisor()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/casos/" + NUMERO).header("Authorization", comprador())).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("select count(*) from archivo", Integer.class)).isEqualTo(antes - 1);
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo = ?", Integer.class, NUMERO)).isZero();

        mvc.perform(delete("/api/v1/casos/" + PARCONA).header("Authorization", revisor()))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/casos/00000000").header("Authorization", revisor()))
                .andExpect(status().isNotFound());
    }
}
