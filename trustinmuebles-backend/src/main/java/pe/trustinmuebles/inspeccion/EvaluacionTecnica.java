package pe.trustinmuebles.inspeccion;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Evaluación técnica presencial de un expediente. El expediente se guarda por valor (módulo independiente). */
@Entity
@Table(name = "evaluacion_tecnica")
@Getter
@Setter
class EvaluacionTecnica {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expediente_id", nullable = false, unique = true)
    private Long expedienteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoTecnico estado;

    @Enumerated(EnumType.STRING)
    private ResultadoTecnico resultado;

    private String profesional;
    private String colegiatura;

    @Column(name = "fecha_solicitud")
    private LocalDate fechaSolicitud;

    @Column(name = "fecha_inspeccion")
    private LocalDate fechaInspeccion;

    @Enumerated(EnumType.STRING)
    @Column(name = "verif_arquitectura")
    private VerificacionCampo verifArquitectura;

    @Enumerated(EnumType.STRING)
    @Column(name = "verif_estructuras")
    private VerificacionCampo verifEstructuras;

    @Enumerated(EnumType.STRING)
    @Column(name = "verif_electricas")
    private VerificacionCampo verifElectricas;

    @Enumerated(EnumType.STRING)
    @Column(name = "verif_sanitarias")
    private VerificacionCampo verifSanitarias;

    @Column(length = 1500)
    private String observaciones;

    @Column(length = 1500)
    private String conclusiones;

    @Column(name = "estudios_adicionales", length = 1000)
    private String estudiosAdicionales;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn = Instant.now();

    /** Código de la cuenta que pidió la inspección. Lo fija el servidor a partir de la sesión, nunca el cliente. */
    @Column(name = "solicitante_codigo")
    private String solicitanteCodigo;

    /** Especialidad del profesional (por ejemplo, Ingeniero Civil). Sale de su cuenta, como el nombre y la colegiatura. */
    @Column(name = "profesional_especialidad")
    private String profesionalEspecialidad;
}
