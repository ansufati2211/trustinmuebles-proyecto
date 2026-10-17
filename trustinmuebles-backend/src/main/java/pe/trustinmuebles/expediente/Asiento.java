package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.clasificacion.EstadoAnotacion;
import pe.trustinmuebles.clasificacion.TipoActo;

/**
 * Asiento de la partida (simulada). La referencia es el número, por ejemplo C00001, D00001 o E00001; su primera letra
 * es el rubro: C títulos de dominio, D gravámenes y cargas, E cancelaciones, F otros.
 */
@Entity
@Table(name = "asiento")
@Getter
@Setter
class Asiento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "expediente_id")
    private Expediente expediente;

    @Column(nullable = false)
    private String referencia;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_acto", nullable = false)
    private TipoActo tipoActo = TipoActo.OTRO;

    /** Solo se usa en el rubro D. Se normaliza: es CANCELADA si un asiento E lo cancela. */
    @Enumerated(EnumType.STRING)
    private EstadoAnotacion estado;

    @Column(name = "fecha_inscripcion")
    private LocalDate fechaInscripcion;

    @Column(name = "titulo_numero")
    private String tituloNumero;

    @Column(name = "fecha_presentacion")
    private LocalDate fechaPresentacion;

    @Column(length = 1500)
    private String texto;

    /** Solo en asientos E: número del asiento D que cancelan. */
    @Column(name = "cancela_numero")
    private String canceloNumero;

    /** Solo en asientos C: titulares que resultan del asiento. De aquí sale la titularidad del expediente. */
    @Column(length = 500)
    private String titulares;

    @Column(nullable = false)
    private int orden;

    char rubro() {
        return referencia.charAt(0);
    }
}
