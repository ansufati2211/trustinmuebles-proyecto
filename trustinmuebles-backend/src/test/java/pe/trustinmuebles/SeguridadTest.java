package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import tools.jackson.databind.JsonNode;

/** CP-01: sesión y permisos (REQ-F01, REQ-NF03, PA4). */
class SeguridadTest extends BaseApiTest {
    @Autowired JwtEncoder jwtEncoder;

    @Test
    @DisplayName("CP-01 login válido devuelve token y rol")
    void loginValido() throws Exception {
        String r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigoCuenta\":\"comprador-01\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario.rol").value("COMPRADOR"))
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(r).get("token").asString()).isNotBlank();
        mvc.perform(get("/api/v1/auth/me").header("Authorization", comprador())).andExpect(status().isOk())
                .andExpect(jsonPath("$.codigoCuenta").value("comprador-01"));
    }

    @Test
    @DisplayName("CP-01 credenciales erróneas dan 401 con mensaje claro")
    void loginIncorrecto() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigoCuenta\":\"comprador-01\",\"password\":\"incorrecta\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Código de cuenta o contraseña incorrectos"));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigoCuenta\":\"no-existe\",\"password\":\"x\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CP-01 sin sesión no se accede a ninguna operación de casos")
    void sinSesion() throws Exception {
        mvc.perform(get("/api/v1/casos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/casos/" + PARCONA)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/glosario")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/casos/" + PARCONA + "/expediente").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/1").contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"REVISADO\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CP-01 el comprador no edita por ruta directa (403)")
    void compradorNoEscribe() throws Exception {
        String comprador = comprador();
        JsonNode antes = leer(PARCONA);
        mvc.perform(put("/api/v1/casos/" + PARCONA + "/expediente").header("Authorization", comprador)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(peticion(antes))))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/casos/" + PARCONA + "/checklist/1").header("Authorization", comprador)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"REVISADO\"}"))
                .andExpect(status().isForbidden());
        var pdf = new MockMultipartFile("documento", "x.pdf", "application/pdf", "%PDF-1.4".getBytes());
        mvc.perform(multipart("/api/v1/casos/" + PARCONA + "/documento").file(pdf).header("Authorization", comprador))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/casos/" + PARCONA).header("Authorization", comprador)).andExpect(status().isForbidden());
        assertThat(leer(PARCONA)).isEqualTo(antes);
    }

    @Test
    @DisplayName("CP-01 se rechazan tokens de otro emisor")
    void tokenDeOtroEmisor() throws Exception {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("otro-emisor").subject("1").issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(600)).claim("rol", "REVISOR").claim("codigo", "x").build();
        String falso = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        mvc.perform(get("/api/v1/casos").header("Authorization", "Bearer " + falso))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("CP-01 la contraseña se guarda como hash BCrypt, nunca en texto plano")
    void contrasenaConHash() {
        var hashes = jdbc.queryForList("select password_hash from usuario", String.class);
        assertThat(hashes).hasSize(CUENTAS_DEMO).allSatisfy(h -> {
            assertThat(h).startsWith("$2");
            assertThat(h).doesNotContain(password);
        });
    }

    @Test
    @DisplayName("CP-01 tras cinco intentos fallidos se bloquea el login (429)")
    void bloqueaFuerzaBruta() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"codigoCuenta\":\"fuerza-bruta\",\"password\":\"x" + i + "\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigoCuenta\":\"fuerza-bruta\",\"password\":\"otra\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("CP-01 no existe registro abierto de cuentas")
    void sinRegistroAbierto() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigoCuenta\":\"nuevo\",\"password\":\"clave-larga-123\"}"))
                .andExpect(status().is4xxClientError());
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(CUENTAS_DEMO);
    }
}
