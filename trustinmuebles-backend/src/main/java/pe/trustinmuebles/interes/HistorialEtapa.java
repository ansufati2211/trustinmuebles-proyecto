package pe.trustinmuebles.interes;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** v2.0 (RF36): un cambio de etapa del seguimiento, con la cuenta que lo hizo, la fecha y el motivo (si lo hubo). */
@Entity
@Table(name = "historial_etapa_interes")
@Getter
@Setter
class HistorialEtapa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interes_id", nullable = false, updatable = false)
    private Long interesId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private EtapaInteres desde;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private EtapaInteres hacia;

    @Column(name = "cuenta_codigo", nullable = false, updatable = false)
    private String cuentaCodigo;

    @Column(name = "registrado_en", nullable = false, updatable = false)
    private Instant registradoEn;

    @Column(updatable = false)
    private String motivo;
}
