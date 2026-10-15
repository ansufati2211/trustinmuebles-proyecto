package pe.trustinmuebles.inspeccion;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.shared.NivelRiesgo;

/** Marcador de inspección sobre un plano 2D; x e y son proporciones 0–1 del ancho y alto del plano. */
@Entity
@Table(name = "pin_falla")
@Getter
@Setter
class PinFalla {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "inspeccion_id")
    private Inspeccion inspeccion;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NivelRiesgo severidad;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 1000)
    private String descripcion;
}
