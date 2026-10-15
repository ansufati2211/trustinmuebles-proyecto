package pe.trustinmuebles.semaforo;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import pe.trustinmuebles.registro.TipoAsiento;

/** Traduce códigos de hallazgo y tipos de asiento a lenguaje llano (REQ-NF01). */
@Component
public class CatalogoExplicaciones {
    private final Properties textos = new Properties();

    public CatalogoExplicaciones() {
        try (InputStream in = new ClassPathResource("semaforo/explicaciones.properties").getInputStream();
                InputStreamReader r = new InputStreamReader(in, StandardCharsets.UTF_8)) {
            textos.load(r);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    String titulo(String codigo) {
        return textos.getProperty(codigo + ".titulo", codigo);
    }

    String explicacion(String codigo) {
        return textos.getProperty(codigo + ".explicacion", "");
    }

    String recomendacion(String codigo) {
        return textos.getProperty(codigo + ".recomendacion", "");
    }

    public String traducirAsiento(TipoAsiento tipo) {
        return textos.getProperty("asiento." + tipo, "");
    }
}
