package pe.trustinmuebles.clasificacion;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

/**
 * Una fila del historial de evaluaciones (I12): se agrega en cada recálculo y nunca se edita ni se borra. Hibernate la
 * trata como inmutable y el repositorio no ofrece métodos de borrado. Guarda el código de la cuenta, no datos personales.
 */
@Entity
@Immutable
@Table(name = "historial_evaluacion")
@Getter
@Setter
class HistorialEvaluacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Referencia por valor: el módulo de clasificación no depende del de expedientes. */
    @Column(name = "expediente_id", nullable = false, updatable = false)
    private Long expedienteId;

    @Column(name = "registrada_en", nullable = false, updatable = false)
    private Instant registradaEn;

    /** Null en la primera evaluación del expediente. */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anterior", updatable = false)
    private EstadoSemaforo estadoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_nuevo", nullable = false, updatable = false)
    private EstadoSemaforo estadoNuevo;

    /** Motivos del resultado, serializados como JSON. */
    @Column(nullable = false, length = 10000, updatable = false)
    private String motivos;

    /** Faltantes del resultado, serializados como JSON. */
    @Column(nullable = false, length = 4000, updatable = false)
    private String faltantes;

    @Column(name = "version_reglas", nullable = false, updatable = false)
    private String versionReglas;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private OrigenEvaluacion origen;

    @Column(name = "cuenta_codigo", nullable = false, updatable = false)
    private String cuentaCodigo;
}
