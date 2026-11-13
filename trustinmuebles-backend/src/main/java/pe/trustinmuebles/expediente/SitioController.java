package pe.trustinmuebles.expediente;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * v1.0 (etapa 6): indexación del sitio. Mientras {@code app.sitio.indexable} sea false (por omisión), robots.txt pide no
 * rastrear nada y la interfaz deja su meta robots en «noindex, nofollow». Sin sesión.
 */
@RestController
class SitioController {
    private final boolean indexable;
    private final String version;
    private final ExpedienteService expedientes;
    private final ProyectoService proyectos;

    SitioController(@Value("${app.sitio.indexable:false}") boolean indexable, @Value("${app.version:1.0.0}") String version,
            ExpedienteService expedientes, ProyectoService proyectos) {
        this.indexable = indexable;
        this.version = version;
        this.expedientes = expedientes;
        this.proyectos = proyectos;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    ResponseEntity<String> robots() {
        return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(robotsTxt(indexable));
    }

    /**
     * Lo que la interfaz necesita saber del sitio: si se puede indexar, (etapa 7) la versión del sistema y (etapa 8) las
     * cifras reales de la portada: inmuebles publicados en el catálogo, proyectos visibles y lotes disponibles en ellos.
     */
    @GetMapping("/api/v1/publico/sitio")
    Map<String, Object> sitio() {
        ProyectoService.CifrasProyectos p = proyectos.cifrasPublicas();
        Map<String, Object> cifras = new LinkedHashMap<>();
        cifras.put("inmueblesPublicados", expedientes.listarPublico(0).total());
        cifras.put("proyectos", p.proyectos());
        cifras.put("lotesDisponibles", p.lotesDisponibles());
        return Map.of("indexable", indexable, "version", version, "cifras", cifras);
    }

    static String robotsTxt(boolean indexable) {
        return indexable ? "User-agent: *\nDisallow: /api/\n" : "User-agent: *\nDisallow: /\n";
    }
}
