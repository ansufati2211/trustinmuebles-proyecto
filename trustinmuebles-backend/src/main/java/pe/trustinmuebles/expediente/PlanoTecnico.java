package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.clasificacion.Especialidad;
import pe.trustinmuebles.clasificacion.EstadoPlano;

/**
 * Un plano del expediente técnico de una vivienda, por especialidad. El estado es documental: dice si el plano está,
 * no si la obra está en buen estado (eso lo dice el informe del especialista).
 */
@Entity
@Table(name = "plano_tecnico")
@Getter
@Setter
class PlanoTecnico {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "expediente_id")
    private Expediente expediente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Especialidad especialidad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoPlano estado = EstadoPlano.NO_PRESENTADO;

    /** Área construida que indica el plano arquitectónico. Se contrasta con la inscrita. */
    @Column(name = "area_construida")
    private BigDecimal areaConstruida;

    /** Solo en el plano de estructuras. */
    @Enumerated(EnumType.STRING)
    @Column(name = "sistema_constructivo")
    private SistemaConstructivo sistemaConstructivo;

    @Column(length = 500)
    private String observacion;

    /** PDF que subió el revisor. Si no hay, el sistema muestra una lámina 2D referencial generada. */
    @Column(name = "archivo_id")
    private String archivoId;
}
