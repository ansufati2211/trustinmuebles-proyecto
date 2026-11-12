package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * v1.0 (etapa 3a): lote del plano de un proyecto. Si tiene caso propio ({@code casoCodigo}), ese caso es su ficha y su
 * estado comercial vigente (no se duplica); si no, el lote se ofrece con el indicador A de la partida matriz del
 * proyecto. Solo se publica con una autorización vigente registrada: la de su caso o la de la partida matriz.
 */
@Entity
@Table(name = "lote_proyecto")
@Getter
@Setter
class LoteProyecto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "proyecto_id")
    private Proyecto proyecto;

    @Column(nullable = false, length = 4)
    private String manzana;

    @Column(nullable = false)
    private int numero;

    @Column(name = "area_m2", nullable = false)
    private BigDecimal areaM2;

    private BigDecimal precio;

    @Column(nullable = false, length = 3)
    private String moneda = "PEN";

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_comercial", nullable = false)
    private EstadoComercial estadoComercial = EstadoComercial.DISPONIBLE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Independizacion independizacion = Independizacion.EN_PARTIDA_MATRIZ;

    /** Zonificación del lote según el certificado del proyecto (por ejemplo, RDM); opcional. */
    @Column(length = 20)
    private String zonificacion;

    /** Caso propio del lote; null si el lote todavía no tiene partida o expediente propio. */
    @Column(name = "caso_codigo", length = 40)
    private String casoCodigo;

    @Column(nullable = false)
    private boolean publicado;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    @PrePersist
    void alCrear() {
        if (creadoEn == null) creadoEn = Instant.now();
    }

    /** Clave del lote dentro del proyecto, por ejemplo «A-7». */
    String clave() {
        return clave(manzana, numero);
    }

    static String clave(String manzana, int numero) {
        return manzana + "-" + numero;
    }

    /** Código del lote en el catálogo, único entre casos y lotes: «altos-de-ventisca-A-7». */
    String codigo() {
        return proyecto.getCodigo() + "-" + clave();
    }
}
