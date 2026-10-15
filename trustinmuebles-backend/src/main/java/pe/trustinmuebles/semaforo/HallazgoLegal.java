package pe.trustinmuebles.semaforo;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.shared.NivelRiesgo;

@Entity
@Table(name = "hallazgo_legal")
@Getter
@Setter
class HallazgoLegal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluacion_id")
    private EvaluacionLegal evaluacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CategoriaLegal categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NivelRiesgo nivel;

    @Column(nullable = false)
    private String codigo;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 1000)
    private String explicacion;

    @Column(length = 1000)
    private String recomendacion;

    @Column(name = "texto_registral", length = 1000)
    private String textoRegistral;
}
