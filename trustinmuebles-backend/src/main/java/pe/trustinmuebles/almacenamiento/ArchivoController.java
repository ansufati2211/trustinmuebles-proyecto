package pe.trustinmuebles.almacenamiento;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.trustinmuebles.shared.NoEncontradoException;

@RestController
@RequestMapping("/api/v1/archivos")
class ArchivoController {
    private final AlmacenamientoService almacenamiento;

    ArchivoController(AlmacenamientoService almacenamiento) {
        this.almacenamiento = almacenamiento;
    }

    /** Solo sirve archivos públicos; los documentos privados se descargan por su módulo con control de acceso. */
    @GetMapping("/{id}")
    ResponseEntity<byte[]> obtener(@PathVariable String id) {
        ArchivoContenido c = almacenamiento.leer(id);
        if (!c.publico()) throw new NoEncontradoException("Archivo", id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(c.contentType()))
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic())
                .body(c.datos());
    }
}
