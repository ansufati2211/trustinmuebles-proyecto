package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;

@Entity
@Table(name = "anotacion")
@Getter
@Setter
class Anotacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "expediente_id")
    private Expediente expediente;

    @Column(nullable = false)
    private String referencia;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoAnotacion estado;

    private String descripcion;

    @Column(nullable = false)
    private int orden;
}
