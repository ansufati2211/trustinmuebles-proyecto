package pe.trustinmuebles.tramite;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Hito del trámite. Cada evento encadena el hash del anterior (REQ-NF03). */
@Entity
@Table(name = "evento_timeline")
@Getter
@Setter
class EventoTimeline {
    static final String GENESIS = "0".repeat(64);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaccion_id", nullable = false)
    private Long transaccionId;

    @Column(nullable = false)
    private String tipo;

    @Column(nullable = false, length = 500)
    private String descripcion;

    @Column(nullable = false)
    private Instant fecha;

    @Column(name = "hash_previo", nullable = false)
    private String hashPrevio;

    @Column(nullable = false)
    private String hash;
}
