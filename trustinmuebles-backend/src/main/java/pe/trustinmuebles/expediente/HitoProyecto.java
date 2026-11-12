package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** v1.0 (etapa 3a): hito del proyecto (por ejemplo, la aprobación de la habilitación urbana). Informativo. */
@Entity
@Table(name = "hito_proyecto")
@Getter
@Setter
class HitoProyecto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "proyecto_id")
    private Proyecto proyecto;

    @Column(nullable = false)
    private int orden;

    @Column(nullable = false, length = 160)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 11)
    private EstadoHito estado;

    private LocalDate fecha;
}
