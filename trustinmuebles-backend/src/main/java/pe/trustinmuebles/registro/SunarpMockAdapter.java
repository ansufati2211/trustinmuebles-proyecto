package pe.trustinmuebles.registro;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Simula SUNARP leyendo copias literales de prueba desde {@code mock-sunarp/<partida>.json}. */
@Component
class SunarpMockAdapter implements RegistroPublicoPort {
    private final ObjectMapper mapper;

    SunarpMockAdapter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public Optional<CopiaLiteral> consultarCopiaLiteral(String numeroPartida) {
        if (numeroPartida == null || !numeroPartida.matches("[0-9A-Za-z_-]{3,30}")) return Optional.empty();
        ClassPathResource recurso = new ClassPathResource("mock-sunarp/" + numeroPartida + ".json");
        if (!recurso.exists()) return Optional.empty();
        try (InputStream in = recurso.getInputStream()) {
            return Optional.of(mapper.readValue(in, CopiaLiteral.class));
        } catch (IOException | RuntimeException e) {
            throw new RegistroNoDisponibleException("No se pudo leer la partida " + numeroPartida, e);
        }
    }
}
