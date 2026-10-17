package pe.trustinmuebles.clasificacion;

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

/** Carga las reglas versionadas de contenido/<versión>/reglas.json. Es idempotente. */
@Component
@Order(20)
class ReglasSeeder implements ApplicationRunner {
    record ReglaJson(String codigo, Prioridad prioridad, TipoCondicion tipoCondicion, String prefijoReferencia,
            String titulo, String explicacion, String estadoRevision) {}

    record DocumentoReglas(String version, String estadoRevision, List<String> condicionesContempladas,
            List<ReglaJson> reglas) {}

    private final ReglaRepository reglas;
    private final CondicionContempladaRepository condiciones;
    private final ObjectMapper json;
    private final String version;

    ReglasSeeder(ReglaRepository reglas, CondicionContempladaRepository condiciones, ObjectMapper json,
            @Value("${app.reglas.version}") String version) {
        this.reglas = reglas;
        this.condiciones = condiciones;
        this.json = json;
        this.version = version;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        DocumentoReglas doc;
        try (InputStream in = new ClassPathResource("contenido/" + version + "/reglas.json").getInputStream()) {
            doc = json.readValue(in, DocumentoReglas.class);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el contenido de reglas " + version, e);
        }
        for (ReglaJson r : doc.reglas()) {
            if (reglas.existsByCodigoAndVersion(r.codigo(), doc.version())) continue;
            Regla regla = new Regla();
            regla.setCodigo(r.codigo());
            regla.setVersion(doc.version());
            regla.setPrioridad(r.prioridad());
            regla.setTipoCondicion(r.tipoCondicion());
            regla.setPrefijoReferencia(r.prefijoReferencia());
            regla.setTitulo(r.titulo());
            regla.setExplicacion(r.explicacion());
            regla.setEstadoRevision(r.estadoRevision());
            reglas.save(regla);
        }
        for (String texto : doc.condicionesContempladas()) {
            if (condiciones.existsByVersionReglasAndTexto(doc.version(), texto)) continue;
            CondicionContemplada c = new CondicionContemplada();
            c.setVersionReglas(doc.version());
            c.setTexto(texto);
            condiciones.save(c);
        }
    }
}
