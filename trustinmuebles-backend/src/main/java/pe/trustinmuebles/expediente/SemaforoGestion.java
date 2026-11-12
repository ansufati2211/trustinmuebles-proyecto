package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import pe.trustinmuebles.identidad.Rol;
import tools.jackson.databind.ObjectMapper;

/**
 * Semáforo de gestión (v0.8, decisión 2, D54). Cálculo puro de solo lectura a partir de la ruta de regularización:
 * faltantes o condición no contemplada → COMPLETAR_INFORMACION; si no, algún paso ALTO → REQUIERE_REGULARIZACION; MEDIO →
 * VIABLE_CON_CONDICIONES; sin pasos o solo BAJO → VIABLE. No escribe nada ni toca A o B (I15).
 */
@Service
public class SemaforoGestion {
    private final Contenido contenido;

    record Estado(String etiqueta, String explicacion, String sugerencia) {}

    record Contenido(String version, String estadoRevision, String aviso, String criterio, Map<String, Estado> estados) {}

    SemaforoGestion(ObjectMapper json, @Value("${app.reglas.version}") String version) {
        try (InputStream in = new ClassPathResource("contenido/" + version + "/gestion.json").getInputStream()) {
            this.contenido = json.readValue(in, Contenido.class);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer contenido/" + version + "/gestion.json", e);
        }
    }

    /** I15: solo el gestor, el revisor y el asesor (v1.0, que reúne a ambos) ven el semáforo de gestión. */
    public static boolean puedeVer(Rol rol) {
        return rol.incluye(Rol.GESTOR) || rol.incluye(Rol.REVISOR);
    }

    public static EstadoGestion estadoDe(RutaRegularizacion ruta) {
        boolean incompleto = ruta.estado() == null || ruta.items().stream()
                .anyMatch(i -> "FALTANTE".equals(i.tipo()) || "CONDICION".equals(i.tipo()));
        if (incompleto) return EstadoGestion.COMPLETAR_INFORMACION;
        if (ruta.esfuerzo() == Esfuerzo.ALTO) return EstadoGestion.REQUIERE_REGULARIZACION;
        if (ruta.esfuerzo() == Esfuerzo.MEDIO) return EstadoGestion.VIABLE_CON_CONDICIONES;
        return EstadoGestion.VIABLE;
    }

    public GestionInmobiliaria de(RutaRegularizacion ruta) {
        EstadoGestion estado = estadoDe(ruta);
        Estado e = contenido.estados().get(estado.name());
        return new GestionInmobiliaria(estado, e.etiqueta(), e.explicacion(), e.sugerencia(), ruta.esfuerzo(),
                contenido.aviso());
    }

    public String etiqueta(EstadoGestion estado) {
        return contenido.estados().get(estado.name()).etiqueta();
    }
}
