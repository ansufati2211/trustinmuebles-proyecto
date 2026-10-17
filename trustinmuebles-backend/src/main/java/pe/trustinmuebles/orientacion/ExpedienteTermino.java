package pe.trustinmuebles.orientacion;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Relación muchos a muchos entre un expediente (por id) y un término del glosario cerrado. */
@Entity
@Table(name = "expediente_termino")
@Getter
@Setter
class ExpedienteTermino {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expediente_id", nullable = false)
    private Long expedienteId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "termino_id")
    private TerminoGlosario termino;
}
