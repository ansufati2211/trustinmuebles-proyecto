package pe.trustinmuebles.inspeccion;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.shared.NivelRiesgo;

@Entity
@Table(name = "inspeccion")
@Getter
@Setter
class Inspeccion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inmueble_id", nullable = false)
    private Long inmuebleId;

    @Column(name = "plano_id", nullable = false)
    private Long planoId;

    @Column(name = "inspector_nombre", nullable = false)
    private String inspectorNombre;

    @Column(length = 2000)
    private String dictamen;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoInspeccion estado = EstadoInspeccion.ABIERTA;

    /** Peor severidad entre los pines; se fija al cerrar la inspección. */
    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_estructural")
    private NivelRiesgo nivelEstructural;

    @Column(nullable = false)
    private Instant fecha = Instant.now();

    @OneToMany(mappedBy = "inspeccion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<PinFalla> pines = new ArrayList<>();
}
