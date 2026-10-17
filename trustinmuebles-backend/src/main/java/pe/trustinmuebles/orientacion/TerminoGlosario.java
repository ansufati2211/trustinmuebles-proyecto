package pe.trustinmuebles.orientacion;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "termino_glosario")
@Getter
@Setter
class TerminoGlosario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String concepto;

    @Column(nullable = false)
    private String explicacion;

    @Column(nullable = false)
    private String version;

    @Column(name = "estado_revision", nullable = false)
    private String estadoRevision;

    TerminoDto dto() {
        return new TerminoDto(concepto, explicacion, version, estadoRevision);
    }
}
