package pe.trustinmuebles;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pe.trustinmuebles.identidad.AuthService;
import pe.trustinmuebles.identidad.Rol;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SeguridadTest {
    private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 };

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AuthService auth;
    @Autowired JwtEncoder jwtEncoder;

    private String token(String email) throws Exception {
        String r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"demo1234\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(r).get("token").asString();
    }

    @Test
    void rechazaSvgYArchivosConBytesFalsos() throws Exception {
        String juan = token("juan.perez@demo.pe");
        var svg = new MockMultipartFile("archivo", "x.svg", "image/svg+xml", "<svg onload=alert(1)/>".getBytes());
        mvc.perform(multipart("/api/v1/transacciones/2/documentos").file(svg).header("Authorization", juan))
                .andExpect(status().isUnprocessableEntity());
        var falso = new MockMultipartFile("archivo", "x.pdf", "application/pdf", "esto no es un pdf".getBytes());
        mvc.perform(multipart("/api/v1/transacciones/2/documentos").file(falso).header("Authorization", juan))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void archivosPublicosSeSirvenConCabecerasSeguras() throws Exception {
        var png = new MockMultipartFile("archivo", "plano.png", "image/png", PNG);
        String r = mvc.perform(multipart("/api/v1/inmuebles/1/planos").file(png).param("nombre", "Plano de prueba")
                .header("Authorization", token("admin@demo.pe"))).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String url = json.readTree(r).get("imagenUrl").asString();
        mvc.perform(get(url)).andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", containsString("sandbox")))
                .andExpect(content().contentType("image/png"));
    }

    @Test
    void loginIncorrectoDaMensajeClaro() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"juan.perez@demo.pe\",\"password\":\"incorrecta\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Correo o contraseña incorrectos"));
    }

    @Test
    void bloqueaLaFuerzaBrutaTrasCincoFallos() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"fuerza.bruta@demo.pe\",\"password\":\"x" + i + "\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"fuerza.bruta@demo.pe\",\"password\":\"otra\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void rechazaTokensDeOtroEmisor() throws Exception {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("otro-emisor").subject("1").issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(600)).claim("rol", "ADMIN").claim("email", "x@x.pe").build();
        String falso = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        mvc.perform(get("/api/v1/transacciones/mias").header("Authorization", "Bearer " + falso))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unGestorNoPuedeMoverTramitesAjenos() throws Exception {
        auth.registrar("Otro Gestor", "otro.gestor@demo.pe", "demo1234", Rol.GESTOR_LEGAL);
        mvc.perform(patch("/api/v1/transacciones/2/etapa").header("Authorization", token("otro.gestor@demo.pe"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"etapa\":\"ESCRITURA_PUBLICA\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void inspeccionesExigenRolYUnPlanoDelMismoInmueble() throws Exception {
        String inspector = token("luis.paredes@demo.pe");
        mvc.perform(post("/api/v1/inmuebles/1/inspecciones").header("Authorization", token("juan.perez@demo.pe"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"planoId\":1}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/inmuebles/1/inspecciones").header("Authorization", inspector)
                .contentType(MediaType.APPLICATION_JSON).content("{\"planoId\":2}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/inmuebles/1/inspecciones").header("Authorization", inspector)
                .contentType(MediaType.APPLICATION_JSON).content("{\"planoId\":1}")).andExpect(status().isCreated());
    }

    @Test
    void limitaElTamanoDeLosTextos() throws Exception {
        mvc.perform(post("/api/v1/transacciones/2/mensajes").header("Authorization", token("juan.perez@demo.pe"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"" + "a".repeat(5000) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void laFichaYaNoIncluyeTour3d() throws Exception {
        mvc.perform(get("/api/v1/inmuebles/1")).andExpect(status().isOk()).andExpect(jsonPath("$.tour3d").doesNotExist());
        mvc.perform(get("/api/v1/inmuebles/1/tour3d")).andExpect(status().isNotFound());
    }
}
