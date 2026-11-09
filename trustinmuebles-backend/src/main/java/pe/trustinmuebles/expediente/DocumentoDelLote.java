package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.clasificacion.DocumentoLote;
import pe.trustinmuebles.clasificacion.EstadoPlano;

/**
 * v0.9: un documento del expediente de un lote (plano perimétrico, memoria descriptiva, certificado de zonificación y vías
 * o tasación). Como en un plano, el estado es documental: dice si el documento está, no si su contenido es correcto.
 */
@Entity
@Table(name = "documento_lote")
@Getter
@Setter
class DocumentoDelLote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "expediente_id")
    private Expediente expediente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentoLote tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoPlano estado = EstadoPlano.NO_PRESENTADO;

    @Column(length = 500)
    private String observacion;

    /** Datos principales del documento, en una línea (por ejemplo, la zonificación y la sección de la vía). */
    @Column(length = 1000)
    private String resumen;

    /** PDF guardado (subido por el revisor o cargado con el contenido). Si no hay, un caso de demostración lo genera. */
    @Column(name = "archivo_id")
    private String archivoId;
}
