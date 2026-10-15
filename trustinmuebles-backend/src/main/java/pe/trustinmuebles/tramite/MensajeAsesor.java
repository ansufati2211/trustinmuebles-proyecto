package pe.trustinmuebles.tramite;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "mensaje_asesor")
@Getter
@Setter
class MensajeAsesor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaccion_id", nullable = false)
    private Long transaccionId;

    @Column(name = "autor_id", nullable = false)
    private Long autorId;

    @Column(nullable = false, length = 2000)
    private String texto;

    @Column(nullable = false)
    private Instant fecha;
}
