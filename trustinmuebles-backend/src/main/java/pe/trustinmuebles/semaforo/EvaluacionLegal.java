package pe.trustinmuebles.semaforo;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.shared.NivelRiesgo;

@Entity
@Table(name = "evaluacion_legal")
@Getter
@Setter
class EvaluacionLegal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inmueble_id", nullable = false)
    private Long inmuebleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NivelRiesgo nivel;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_dominio", nullable = false)
    private NivelRiesgo nivelDominio;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_gravamenes", nullable = false)
    private NivelRiesgo nivelGravamenes;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_procesos", nullable = false)
    private NivelRiesgo nivelProcesos;

    @Column(name = "hash_copia", nullable = false)
    private String hashCopia;

    @Column(nullable = false)
    private Instant fecha = Instant.now();

    @OneToMany(mappedBy = "evaluacion", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<HallazgoLegal> hallazgos = new ArrayList<>();
}
