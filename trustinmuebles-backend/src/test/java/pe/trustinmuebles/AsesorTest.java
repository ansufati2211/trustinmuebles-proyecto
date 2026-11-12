package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * v1.0 (etapa 1): el ASESOR reúne los permisos del REVISOR y del GESTOR. Registra, subsana, publica, atiende contactos
 * y asigna inspecciones; no autoriza por un particular ni emite el informe técnico (B). Base H2 propia, como
 * CicloCarteraTest, para no alterar los datos de las demás pruebas.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:asesor-${random.uuid};MODE=PostgreSQL;"
        + "DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1")
class AsesorTest extends BaseApiTest {
    static final String CASO = "66666601";
    static final MediaType JSON = MediaType.APPLICATION_JSON;

    String asesor() throws Exception {
        return token("asesor-01");
    }

    ObjectNode vivienda(String numero) {
        ObjectNode p = json.createObjectNode();
        p.put("origen", "TRANSCRITA_CONOCE_AQUI");
        p.put("numero", numero);
        p.put("denominacion", "Mz. R Lote 4 · Hab. Urb. Los Sauces · Ica");
        p.put("contexto", "Ica, Ica");
        p.put("fechaConsulta", "2026-11-10");
        p.put("condicionRepresentada", "Vivienda inscrita en el Registro de Predios.");
        p.put("completitud", "COMPLETA");
        ArrayNode a = p.putArray("asientos");
        ObjectNode c = a.addObject();
        c.put("referencia", "C00001");
        c.put("tipoActo", "COMPRAVENTA");
        c.put("texto", "Inmobiliaria Los Sauces S.A.C. adquirió el predio por compraventa.");
        c.put("titulares", "Inmobiliaria Los Sauces S.A.C. (100 %)");
        p.put("tipoPredio", "VIVIENDA");
        p.put("areaConstruidaInscrita", 120.00);
        ArrayNode planos = p.putArray("planos");
        for (String esp : new String[] {"ARQUITECTURA", "ESTRUCTURAS", "ELECTRICAS", "SANITARIAS"}) {
            planos.addObject().put("especialidad", esp).put("estado", "NO_PRESENTADO");
        }
        p.put("confirmaSinDatosPersonales", true);
        p.put("propietarioCodigo", "propietario-01");
        return p;
    }

    ObjectNode informe() {
        ObjectNode i = json.createObjectNode();
        i.put("estado", "EMITIDO");
        i.put("resultado", "FAVORABLE");
        i.put("fechaInspeccion", LocalDate.now().minusDays(1).toString());
        for (String campo : new String[] {"verifArquitectura", "verifEstructuras", "verifElectricas", "verifSanitarias"}) {
            i.put(campo, "CONFORME");
        }
        i.put("conclusiones", "Sin observaciones en la inspección visual.");
        return i;
    }

    @Test
    @DisplayName("asesor-01 existe con rol ASESOR y función de asesor inmobiliario")
    void cuentaAsesor() throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", asesor())).andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("ASESOR"))
                .andExpect(jsonPath("$.funcion").value("Asesor inmobiliario"));
        assertThat(jdbc.queryForObject("select count(*) from usuario where codigo_cuenta = 'asesor-01' "
                + "and nombre_completo is null and colegiatura is null", Integer.class))
                .as("I11: sin nombre ni colegiatura").isEqualTo(1);
    }

    @Test
    @DisplayName("El asesor registra, subsana, publica, atiende y asigna; no autoriza por un particular ni emite B")
    void permisosDelAsesor() throws Exception {
        String asesor = asesor();
        String comprador = comprador();

        // Registra (permiso del revisor).
        mvc.perform(post("/api/v1/casos").header("Authorization", asesor).contentType(JSON)
                .content(json.writeValueAsString(vivienda(CASO)))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.publicacion.estado").value("BORRADOR"))
                .andExpect(jsonPath("$.publicacion.titularidadComercial").value("PARTICULAR"))
                .andExpect(jsonPath("$.gestion").exists());
        String colorInicial = leerComo(CASO, asesor).get("evaluacion").get("estado").asString();

        // Subsana: sube el PDF de un plano y edita el expediente (recalcula con las reglas, no a mano).
        subirPlano(CASO, "ARQUITECTURA", asesor).andExpect(status().isCreated());
        ObjectNode edicion = peticion(leerComo(CASO, asesor));
        edicion.put("nota", "Planos en revisión por el asesor.");
        actualizarExpediente(CASO, asesor, edicion).andExpect(status().isOk())
                .andExpect(jsonPath("$.expediente.nota").value("Planos en revisión por el asesor."));
        mvc.perform(get("/api/v1/casos/" + CASO + "/historial").header("Authorization", asesor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()", greaterThanOrEqualTo(2)));

        // No autoriza por un particular: solo su propietario.
        mvc.perform(put("/api/v1/casos/" + CASO + "/autorizacion").header("Authorization", asesor))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + CASO + "/publicacion").header("Authorization", asesor))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(put("/api/v1/casos/" + CASO + "/autorizacion").header("Authorization", propietario(1)))
                .andExpect(status().isOk());

        // Publica (permiso del gestor). Publicar no cambia A.
        mvc.perform(post("/api/v1/casos/" + CASO + "/publicacion").header("Authorization", asesor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("PUBLICADO"));
        String colorPublicado = leerComo(CASO, asesor).get("evaluacion").get("estado").asString();

        // Atiende un contacto.
        String contacto = mvc.perform(post("/api/v1/casos/" + CASO + "/contactos").header("Authorization", comprador)
                .contentType(JSON).content("{\"motivo\":\"INFORMACION_GENERAL\"}")).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(contacto).get("id").asLong();
        mvc.perform(get("/api/v1/contactos").header("Authorization", asesor)).andExpect(status().isOk());
        mvc.perform(put("/api/v1/contactos/" + id + "/atencion").header("Authorization", asesor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ATENDIDA"));
        mvc.perform(get("/api/v1/cartera/panel").header("Authorization", asesor)).andExpect(status().isOk());

        // Asigna la inspección que pidió el comprador.
        mvc.perform(post("/api/v1/casos/" + CASO + "/inspeccion/solicitud").header("Authorization", asesor))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/casos/" + CASO + "/inspeccion/solicitud").header("Authorization", comprador))
                .andExpect(status().isCreated());
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion/asignacion").header("Authorization", asesor)
                .contentType(JSON).content("{\"especialistaCodigo\":\"especialista-01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.especialistaAsignadoCodigo").value("especialista-01"));

        // No emite el informe técnico (B): solo el especialista.
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion").header("Authorization", asesor).contentType(JSON)
                .content(json.writeValueAsString(informe()))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/casos/" + CASO + "/inspeccion").header("Authorization", token("especialista-01"))
                .contentType(JSON).content(json.writeValueAsString(informe()))).andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluacionTecnica.estado").value("EMITIDO"));
        assertThat(leerComo(CASO, asesor).get("evaluacion").get("estado").asString())
                .as("ni publicar ni B cambian A").isEqualTo(colorPublicado);
        assertThat(colorInicial).isNotNull();

        // Retira la publicación (gestor) y elimina la partida captada (revisor).
        mvc.perform(delete("/api/v1/casos/" + CASO + "/publicacion").header("Authorization", asesor))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("RETIRADO"));
    }

    @Test
    @DisplayName("El asesor ve todos los casos y el semáforo de gestión, como el revisor y el gestor")
    void visibilidad() throws Exception {
        String asesor = asesor();
        mvc.perform(get("/api/v1/casos").header("Authorization", asesor)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].gestion").exists());
        mvc.perform(get("/api/v1/casos/" + PARCONA + "/decisiones-captacion").header("Authorization", asesor))
                .andExpect(status().isOk());
    }
}
