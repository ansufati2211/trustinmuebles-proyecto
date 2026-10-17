package pe.trustinmuebles.clasificacion;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

/** Evaluación vigente de un expediente (una como máximo, sin historial). El color nunca se fija a mano (RN-06). */
@Entity
@Table(name = "evaluacion")
@Getter
@Setter
class EvaluacionInformativa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expediente_id", nullable = false, unique = true)
    private Long expedienteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoSemaforo estado;

    /** ResultadoClasificacion serializado como JSON. */
    @Column(nullable = false, length = 10000)
    private String detalle;

    @Column(name = "version_reglas", nullable = false)
    private String versionReglas;

    @Column(name = "expediente_version", nullable = false)
    private Long expedienteVersion;

    @Column(name = "calculada_en", nullable = false)
    private Instant calculadaEn;

    @ManyToMany
    @JoinTable(name = "evaluacion_regla", joinColumns = @JoinColumn(name = "evaluacion_id"),
            inverseJoinColumns = @JoinColumn(name = "regla_id"))
    private Set<Regla> reglas = new HashSet<>();
}
