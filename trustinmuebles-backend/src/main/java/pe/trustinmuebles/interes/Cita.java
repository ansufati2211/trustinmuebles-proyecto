package pe.trustinmuebles.interes;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.interes.Opciones.EstadoCita;
import pe.trustinmuebles.interes.Opciones.Franja;
import pe.trustinmuebles.interes.Opciones.ModalidadCita;

/** v1.0 (etapa 4): cita o consulta pedida por un interesado. Sin pagos. */
@Entity
@Table(name = "cita")
@Getter
@Setter
class Cita {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interes_id", nullable = false, updatable = false)
    private Long interesId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private ModalidadCita modalidad;

    @Column(nullable = false)
    private LocalDate fecha1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Franja franja1;

    private LocalDate fecha2;

    @Enumerated(EnumType.STRING)
    private Franja franja2;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoCita estado = EstadoCita.SOLICITADA;

    @Column(name = "fecha_acordada")
    private LocalDate fechaAcordada;

    @Enumerated(EnumType.STRING)
    @Column(name = "franja_acordada")
    private Franja franjaAcordada;

    @Column(name = "motivo_rechazo")
    private String motivoRechazo;

    @Column(name = "creada_en", nullable = false, updatable = false)
    private Instant creadaEn;

    @Column(name = "actualizada_en", nullable = false)
    private Instant actualizadaEn;

    @Column(name = "atendida_por")
    private String atendidaPor;

    /** Precarga: días respecto del arranque; null en una cita real o ya atendida por una persona. */
    @Column(name = "semilla_desfase")
    private Integer semillaDesfase;
}
