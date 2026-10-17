package pe.trustinmuebles.clasificacion;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "regla")
@Getter
@Setter
class Regla {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String codigo;

    @Column(nullable = false)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Prioridad prioridad;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_condicion", nullable = false)
    private TipoCondicion tipoCondicion;

    @Column(name = "prefijo_referencia")
    private String prefijoReferencia;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false)
    private String explicacion;

    @Column(name = "estado_revision", nullable = false)
    private String estadoRevision;

    ReglaAplicable aplicable() {
        return new ReglaAplicable(codigo, prioridad, tipoCondicion, prefijoReferencia, titulo, explicacion);
    }
}
