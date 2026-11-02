package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import pe.trustinmuebles.shared.Hashing;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v0.8 (feedback c y decisión 4): un plano solo queda presentado con su PDF; la subida se valida, se optimiza si pesa
 * más del umbral y se rechaza si no baja del máximo. Las pruebas usan los límites pequeños de application-test
 * (entrada 3 MB, umbral 0,25 MB, máximo almacenado 1 MB) y PDF generados en la propia prueba.
 */
class DocumentosApiTest extends BaseApiTest {
    static final String CAPTADA = "SIM-99000808";

    ObjectNode vivienda(String numero) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "SIMULADA_DEMOSTRACION");
        p.put("numero", numero);
        p.put("denominacion", "Mz. Q Lote 8 · Hab. Urb. Demostración · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-11-01");
        p.put("condicionRepresentada", "Lote urbano inscrito en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Se inscribe el dominio a favor de Inmobiliaria Demo Sur S.A.C. (100 %).");
        c.put("titulares", "Inmobiliaria Demo Sur S.A.C. (100 %)");
        p.put("tipoPredio", "VIVIENDA");
        ArrayNode planos = p.putArray("planos");
        for (String e : new String[] {"ARQUITECTURA", "ESTRUCTURAS", "ELECTRICAS", "SANITARIAS"}) {
            planos.addObject().put("especialidad", e).put("estado", "NO_PRESENTADO");
        }
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-01");
        return p;
    }

    void registrar(ObjectNode cuerpo) throws Exception {
        mvc.perform(post("/api/v1/casos").header("Authorization", revisor()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(cuerpo))).andExpect(status().isCreated());
    }

    void borrar(String codigo) throws Exception {
        mvc.perform(delete("/api/v1/casos/" + codigo).header("Authorization", revisor()));
    }

    int filasHistorial(String codigo) {
        return jdbc.queryForObject("select count(*) from historial_evaluacion where expediente_id = "
                + "(select e.id from expediente e join caso_lote c on c.id = e.caso_id where c.codigo = ?)",
                Integer.class, codigo);
    }

    static JsonNode plano(JsonNode detalle, String especialidad) {
        for (JsonNode p : detalle.get("expediente").get("planos")) {
            if (p.get("especialidad").asString().equals(especialidad)) return p;
        }
        throw new AssertionError("Sin plano " + especialidad);
    }

    static MockMultipartFile archivo(byte[] datos) {
        return new MockMultipartFile("documento", "plano.pdf", "application/pdf", datos);
    }

    @Test
    @DisplayName("CP18: marcar PRESENTADO u OBSERVADO un plano sin archivo da 422, al editar y al registrar")
    void presentadoSinArchivoDa422() throws Exception {
        JsonNode original = leer(TINGUINA);
        for (String estado : new String[] {"PRESENTADO", "OBSERVADO"}) {
            ObjectNode p = peticion(original);
            for (var plano : (ArrayNode) p.get("planos")) {
                if (plano.get("especialidad").asString().equals("ELECTRICAS")) ((ObjectNode) plano).put("estado", estado);
            }
            actualizarExpediente(TINGUINA, revisor(), p).andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.detail", startsWith("Sube el PDF del plano antes de marcarlo como presentado")));
        }
        assertThat(leer(TINGUINA)).as("el rechazo no deja cambios").isEqualTo(original);

        ObjectNode cuerpo = vivienda("SIM-99000809");
        ((ObjectNode) cuerpo.get("planos").get(0)).put("estado", "PRESENTADO");
        mvc.perform(post("/api/v1/casos").header("Authorization", revisor()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(cuerpo))).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("select count(*) from caso_lote where codigo = 'SIM-99000809'", Integer.class))
                .as("el registro rechazado no deja un caso a medias").isZero();
    }

    @Test
    @DisplayName("CP18: subir el PDF de un plano no presentado lo deja PRESENTADO, recalcula y agrega una fila al historial")
    void subirAPlanoNoPresentado() throws Exception {
        try {
            registrar(vivienda(CAPTADA));
            int antes = filasHistorial(CAPTADA);
            subirPlano(CAPTADA, "ARQUITECTURA", revisor()).andExpect(status().isCreated())
                    .andExpect(jsonPath("$.sha256", hasLength(64)))
                    .andExpect(jsonPath("$.optimizado").value(false));
            assertThat(filasHistorial(CAPTADA)).isEqualTo(antes + 1);
            JsonNode d = leerComo(CAPTADA, revisor());
            JsonNode arq = plano(d, "ARQUITECTURA");
            assertThat(arq.get("estado").asString()).isEqualTo("PRESENTADO");
            assertThat(arq.get("documento").get("origen").asString()).isEqualTo("SUBIDO");
            assertThat(arq.get("documento").get("subidoPor").asString()).isEqualTo("revisor-01");
            assertThat(arq.get("documento").get("subidoEn").asString()).isNotBlank();
            assertThat(arq.get("documento").get("tamanoBytes").asLong()).isPositive();
            JsonNode ultima = json.readTree(mvc.perform(get("/api/v1/casos/" + CAPTADA + "/historial")
                    .header("Authorization", revisor())).andReturn().getResponse().getContentAsString()).get(antes);
            assertThat(ultima.get("origen").asString()).isEqualTo("PLANO_ADJUNTO");

            // Ya con su archivo, el plano puede pasar a observado en el editor.
            ObjectNode p = peticion(d);
            for (var pl : (ArrayNode) p.get("planos")) {
                if (pl.get("especialidad").asString().equals("ARQUITECTURA")) {
                    ((ObjectNode) pl).put("estado", "OBSERVADO").put("observacion", "Sin sello");
                }
            }
            actualizarExpediente(CAPTADA, revisor(), p).andExpect(status().isOk())
                    .andExpect(jsonPath("$.expediente.planos[?(@.especialidad=='ARQUITECTURA')].estado", contains("OBSERVADO")));
            // Un plano sin archivo de una partida captada no muestra lámina: falta el archivo.
            mvc.perform(get("/api/v1/casos/" + CAPTADA + "/planos/ESTRUCTURAS/documento")
                    .header("Authorization", revisor())).andExpect(status().isNotFound());
        } finally {
            borrar(CAPTADA);
        }
    }

    @Test
    @DisplayName("CP19: un archivo que no es PDF, con otro tipo, dañado o cifrado da 400 con un mensaje claro")
    void validacion() throws Exception {
        String ruta = "/api/v1/casos/" + PARCONA + "/documento";
        mvc.perform(multipart(ruta).file(archivo("hola, no soy un PDF".getBytes())).header("Authorization", revisor()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail", containsString("debe ser un PDF")));
        mvc.perform(multipart(ruta).file(new MockMultipartFile("documento", "x.pdf", "text/plain",
                PdfDePrueba.simple("tipo equivocado"))).header("Authorization", revisor()))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart(ruta).file(archivo("%PDF-1.7\nbasura sin objetos\n".getBytes()))
                .header("Authorization", revisor()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail", containsString("dañado")));
        mvc.perform(multipart(ruta).file(archivo(PdfDePrueba.cifrado())).header("Authorization", revisor()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail", containsString("contraseña")));
        assertThat(leer(PARCONA).get("expediente").get("documentoGenerado").asBoolean())
                .as("un rechazo no reemplaza el documento").isTrue();
    }

    @Test
    @DisplayName("CP20: un PDF con imágenes grandes sobre el umbral se optimiza, baja de tamaño y conserva sus páginas")
    void optimiza() throws Exception {
        byte[] grande = PdfDePrueba.conImagenes(2, 700, 500);
        assertThat(grande.length).as("el PDF de prueba supera el umbral de 0,25 MB").isGreaterThan(300_000);
        try {
            registrar(vivienda(CAPTADA));
            JsonNode r = json.readTree(mvc.perform(multipart("/api/v1/casos/" + CAPTADA + "/planos/ARQUITECTURA/documento")
                            .file(archivo(grande)).header("Authorization", revisor()))
                    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
            assertThat(r.get("optimizado").asBoolean()).isTrue();
            assertThat(r.get("tamanoOriginalBytes").asLong()).isEqualTo(grande.length);
            assertThat(r.get("tamanoBytes").asLong()).isLessThan(grande.length);

            byte[] guardado = mvc.perform(get("/api/v1/casos/" + CAPTADA + "/planos/ARQUITECTURA/documento")
                    .header("Authorization", revisor())).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsByteArray();
            assertThat(guardado.length).isEqualTo(r.get("tamanoBytes").asLong());
            try (PDDocument doc = Loader.loadPDF(guardado)) {
                assertThat(doc.getNumberOfPages()).isEqualTo(2);
            }
            JsonNode info = plano(leerComo(CAPTADA, revisor()), "ARQUITECTURA").get("documento");
            assertThat(info.get("optimizado").asBoolean()).isTrue();
            assertThat(info.get("tamanoOriginalBytes").asLong()).isEqualTo(grande.length);
        } finally {
            borrar(CAPTADA);
        }
    }

    @Test
    @DisplayName("CP21: un PDF que no baja del máximo almacenado, o que supera la entrada, da 413 con el tamaño")
    void rechazaPorTamano() throws Exception {
        String ruta = "/api/v1/casos/" + PARCONA + "/planos/ESTRUCTURAS/documento";
        mvc.perform(multipart(ruta).file(archivo(PdfDePrueba.conRelleno(1_400_000))).header("Authorization", revisor()))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.detail", allOf(containsString("incluso optimizado"),
                        containsString("el máximo es 1 MB"), containsString("Reduce su resolución o divídelo"))));
        byte[] enorme = new byte[3 * 1024 * 1024 + 10];
        System.arraycopy("%PDF-1.7\n".getBytes(), 0, enorme, 0, 9);
        mvc.perform(multipart(ruta).file(archivo(enorme)).header("Authorization", revisor()))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.detail").value("El archivo supera 3 MB"));
        assertThat(plano(leer(PARCONA), "ESTRUCTURAS").get("tieneDocumentoPropio").asBoolean())
                .as("el rechazo no asocia ningún archivo").isFalse();
    }

    @Test
    @DisplayName("CP22: la descarga devuelve exactamente el archivo guardado (misma huella SHA-256) y el detalle dice su origen")
    void descargaYOrigen() throws Exception {
        try {
            registrar(vivienda(CAPTADA));
            JsonNode r = json.readTree(mvc.perform(multipart("/api/v1/casos/" + CAPTADA + "/documento")
                            .file(archivo(PdfDePrueba.simple("Copia literal de prueba"))).header("Authorization", revisor()))
                    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
            byte[] descargado = mvc.perform(get("/api/v1/casos/" + CAPTADA + "/documento")
                    .header("Authorization", revisor())).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsByteArray();
            assertThat(Hashing.sha256(descargado)).isEqualTo(r.get("sha256").asString());
            JsonNode doc = leerComo(CAPTADA, revisor()).get("expediente").get("documento");
            assertThat(doc.get("origen").asString()).isEqualTo("SUBIDO");
            assertThat(doc.get("sha256").asString()).isEqualTo(r.get("sha256").asString());
        } finally {
            borrar(CAPTADA);
        }
        // Los casos de demostración: copia y láminas generadas por el sistema.
        JsonNode parcona = leer(PARCONA).get("expediente");
        assertThat(parcona.get("documento").get("origen").asString()).isEqualTo("GENERADO");
        assertThat(plano(leer(PARCONA), "ARQUITECTURA").get("documento").get("origen").asString()).isEqualTo("GENERADO");
        assertThat(plano(leer(TINGUINA), "ELECTRICAS").get("documento").isNull())
                .as("un plano no presentado no tiene documento").isTrue();
    }

    @Test
    @DisplayName("I9: subir un PDF (también optimizado) a un caso rojo por embargo no cambia su color")
    void pdfNoLevantaUnRojo() throws Exception {
        try {
            ObjectNode cuerpo = vivienda(CAPTADA);
            ObjectNode d = ((ArrayNode) cuerpo.get("asientos")).addObject();
            d.put("referencia", "D00001");
            d.put("tipoActo", "EMBARGO");
            d.put("estado", "VIGENTE");
            d.put("texto", "Embargo en forma de inscripción por mandato judicial.");
            registrar(cuerpo);
            for (String e : new String[] {"ARQUITECTURA", "ESTRUCTURAS", "ELECTRICAS", "SANITARIAS"}) {
                subirPlano(CAPTADA, e, revisor()).andExpect(status().isCreated());
            }
            assertThat(leerComo(CAPTADA, revisor()).get("evaluacion").get("estado").asString()).isEqualTo("ROJO");
            mvc.perform(multipart("/api/v1/casos/" + CAPTADA + "/documento")
                    .file(archivo(PdfDePrueba.conImagenes(1, 700, 500))).header("Authorization", revisor()))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.optimizado").value(true));
            JsonNode ev = leerComo(CAPTADA, revisor()).get("evaluacion");
            assertThat(ev.get("estado").asString()).isEqualTo("ROJO");
            assertThat(ev.get("reglasAplicadas").toString()).contains("RP-01");
        } finally {
            borrar(CAPTADA);
        }
    }
}
