package pe.trustinmuebles;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** I6: es un sistema de uso local. La estética comercial de la v0.6 no cambia el modelo de seguridad (D9). */
class ConfiguracionLocalTest {

    @Test
    @DisplayName("I6: el backend escucha solo en 127.0.0.1 y el CORS solo admite la interfaz local")
    void soloEscuchaEnLocal() throws Exception {
        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("server.address")).isEqualTo("127.0.0.1");
        assertThat(p.getProperty("app.cors.allowed-origins")).isEqualTo("http://localhost:5173");
    }
}
