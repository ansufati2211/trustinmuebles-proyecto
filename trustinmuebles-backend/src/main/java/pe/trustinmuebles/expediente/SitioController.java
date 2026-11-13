package pe.trustinmuebles.expediente;

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

    SitioController(@Value("${app.sitio.indexable:false}") boolean indexable) {
        this.indexable = indexable;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    ResponseEntity<String> robots() {
        return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(robotsTxt(indexable));
    }

    /** Lo que la interfaz necesita saber del sitio: si se puede indexar. */
    @GetMapping("/api/v1/publico/sitio")
    Map<String, Object> sitio() {
        return Map.of("indexable", indexable);
    }

    static String robotsTxt(boolean indexable) {
        return indexable ? "User-agent: *\nDisallow: /api/\n" : "User-agent: *\nDisallow: /\n";
    }
}
