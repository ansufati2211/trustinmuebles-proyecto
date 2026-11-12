package pe.trustinmuebles.interes;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

/** v1.0 (etapa 4): nota de seguimiento de un interesado. Solo se agrega; no se edita ni se borra por sí sola. */
@Entity
@Immutable
@Table(name = "nota_interes")
@Getter
@Setter
class NotaInteres {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interes_id", nullable = false, updatable = false)
    private Long interesId;

    @Column(nullable = false, updatable = false)
    private String texto;

    @Column(name = "cuenta_codigo", nullable = false, updatable = false)
    private String cuentaCodigo;

    @Column(name = "creada_en", nullable = false, updatable = false)
    private Instant creadaEn;
}
