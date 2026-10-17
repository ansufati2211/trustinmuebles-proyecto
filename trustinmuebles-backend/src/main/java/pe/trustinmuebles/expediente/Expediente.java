package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.clasificacion.Completitud;

@Entity
@Table(name = "expediente")
@Getter
@Setter
class Expediente {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "caso_id", unique = true)
    private CasoLote caso;

    /** Bloqueo optimista: una edición con versión vieja se rechaza con 409 (REQ-NF04). */
    @Version
    private Long version;

    @Column(name = "condicion_representada", nullable = false)
    private String condicionRepresentada;

    /** Se deriva del último asiento C de la partida, o es «desconocido» si no hay ninguno. No se edita a mano. */
    @Column(nullable = false)
    private String titularidad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Completitud completitud;

    /** Fecha referencial del caso. No vence automáticamente ni consulta actualidad oficial (RN-08). */
    @Column(name = "fecha_referencial", nullable = false)
    private LocalDate fechaReferencial;

    @Column(length = 500)
    private String nota;

    @Column(name = "zona_registral")
    private String zonaRegistral;

    @Column(name = "oficina_registral")
    private String oficinaRegistral;

    private String ubicacion;

    @Column(name = "area_m2")
    private BigDecimal areaM2;

    @Column(length = 1000)
    private String linderos;

    @Column(name = "antecedente_dominial", length = 500)
    private String antecedenteDominial;

    @Column(name = "documento_archivo_id")
    private String documentoArchivoId;

    /** true: el sistema regenera el PDF al guardar. false: el revisor subió un PDF propio y no se pisa. */
    @Column(name = "documento_generado", nullable = false)
    private boolean documentoGenerado;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn = Instant.now();

    @OneToMany(mappedBy = "expediente", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC, id ASC")
    private List<Asiento> asientos = new ArrayList<>();
}
