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

    /** v0.8: tamaño del archivo que se recibió, antes de optimizarlo. Igual a {@code tamano} si no se optimizó. */
    @Column(name = "tamano_original")
    private Long tamanoOriginal;

    private boolean optimizado;

    /** v0.8: cuenta que subió el archivo; null si lo generó el sistema. */
    @Column(name = "subido_por", length = 40)
    private String subidoPor;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn = Instant.now();
}
