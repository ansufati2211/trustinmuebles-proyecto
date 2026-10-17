package pe.trustinmuebles.orientacion;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** Carga el glosario cerrado de contenido/<versión>/glosario.json. Es idempotente. */
@Component
@Order(20)
class GlosarioSeeder implements ApplicationRunner {
    record TerminoJson(String concepto, String explicacion) {}

    record DocumentoGlosario(String version, String estadoRevision, List<TerminoJson> terminos) {}

    private final TerminoRepository repo;
    private final ObjectMapper json;
    private final String version;

    GlosarioSeeder(TerminoRepository repo, ObjectMapper json, @Value("${app.reglas.version}") String version) {
        this.repo = repo;
        this.json = json;
        this.version = version;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        DocumentoGlosario doc;
        try (InputStream in = new ClassPathResource("contenido/" + version + "/glosario.json").getInputStream()) {
            doc = json.readValue(in, DocumentoGlosario.class);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el glosario " + version, e);
        }
        for (TerminoJson t : doc.terminos()) {
            if (repo.findByConcepto(t.concepto()).isPresent()) continue;
            TerminoGlosario g = new TerminoGlosario();
            g.setConcepto(t.concepto());
            g.setExplicacion(t.explicacion());
            g.setVersion(doc.version());
            g.setEstadoRevision(doc.estadoRevision());
            repo.save(g);
        }
    }
}
