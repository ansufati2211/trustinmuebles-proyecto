package pe.trustinmuebles.cartera;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * Una decisión de captación registrada por el gestor (v0.8). Fila de solo adición: se inserta y no se modifica. El caso
 * se guarda por valor y la cuenta sale de la sesión.
 */
@Entity
@Table(name = "decision_captacion")
@Getter
@Setter
class DecisionCaptacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expediente_id", nullable = false, updatable = false)
    private Long expedienteId;

    @Column(name = "caso_codigo", nullable = false, updatable = false)
    private String casoCodigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private DecisionCaptacionTipo decision;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private MotivoDecision motivo;

    @Column(name = "cuenta_codigo", nullable = false, updatable = false)
    private String cuentaCodigo;

    @Column(name = "registrada_en", nullable = false, updatable = false)
    private Instant registradaEn;
}
