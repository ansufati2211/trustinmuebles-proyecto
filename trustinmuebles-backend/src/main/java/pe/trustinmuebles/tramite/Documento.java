package pe.trustinmuebles.tramite;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "documento")
@Getter
@Setter
class Documento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaccion_id", nullable = false)
    private Long transaccionId;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String tipo;

    @Column(name = "archivo_id", nullable = false)
    private String archivoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_firma", nullable = false)
    private EstadoFirma estadoFirma = EstadoFirma.NO_REQUIERE;

    @Column(nullable = false)
    private String sha256;

    @Column(name = "subido_en", nullable = false)
    private Instant subidoEn;

    @Column(name = "firmado_en")
    private Instant firmadoEn;

    @Column(name = "firmado_por_id")
    private Long firmadoPorId;
}
