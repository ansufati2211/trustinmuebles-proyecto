package pe.trustinmuebles.almacenamiento;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "archivo")
@Getter
@Setter
class ArchivoAlmacenado {
    @Id
    private String id;

    @Column(name = "nombre_original", nullable = false)
    private String nombreOriginal;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    private long tamano;

    @Column(nullable = false)
    private String sha256;

    /** Solo los archivos públicos (imágenes, planos) se sirven sin autenticación. */
    private boolean publico;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn = Instant.now();
}
