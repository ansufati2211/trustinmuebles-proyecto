package pe.trustinmuebles.clasificacion;

import jakarta.persistence.*;
import java.util.EnumSet;
import java.util.Set;
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

    /** Tipos de acto a los que aplica, separados por comas. Vacío: a cualquiera. */
    @Column(name = "tipos_acto")
    private String tiposActo;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false)
    private String explicacion;

    @Column(name = "estado_revision", nullable = false)
    private String estadoRevision;

    ReglaAplicable aplicable() {
        Set<TipoActo> tipos = EnumSet.noneOf(TipoActo.class);
        if (tiposActo != null && !tiposActo.isBlank()) {
            for (String t : tiposActo.split(",")) tipos.add(TipoActo.valueOf(t.trim()));
        }
        return new ReglaAplicable(codigo, prioridad, tipoCondicion, prefijoReferencia, Set.copyOf(tipos), titulo,
                explicacion);
    }
}
