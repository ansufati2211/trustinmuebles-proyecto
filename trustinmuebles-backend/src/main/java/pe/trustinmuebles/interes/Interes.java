package pe.trustinmuebles.interes;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import pe.trustinmuebles.interes.Opciones.FormaPago;
import pe.trustinmuebles.interes.Opciones.MedioContacto;
import pe.trustinmuebles.interes.Opciones.OrigenInteres;

/**
 * v1.0 (etapa 4): un interesado. Guarda a qué se refiere (por valor), lo que busca, un nombre de pila con un solo medio
 * de contacto y su consentimiento con la versión del texto aceptado, y el seguimiento del asesor. Nunca un DNI.
 */
@Entity
@Table(name = "interes")
@Getter
@Setter
class Interes {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private OrigenInteres origen;

    @Column(name = "caso_codigo", updatable = false)
    private String casoCodigo;

    @Column(name = "proyecto_codigo", updatable = false)
    private String proyectoCodigo;

    @Column(name = "lote_clave", updatable = false)
    private String loteClave;

    /** Código que ve el comprador (partida o código del lote). */
    @Column(updatable = false)
    private String referencia;

    /** Nombre del inmueble o del proyecto al momento del interés. */
    @Column(updatable = false)
    private String inmueble;

    private String zona;

    /** LOTE o VIVIENDA; null si no lo indicó. */
    private String tipo;

    @Column(name = "presupuesto_min")
    private BigDecimal presupuestoMin;

    @Column(name = "presupuesto_max")
    private BigDecimal presupuestoMax;

    private String moneda;

    @Column(name = "area_deseada")
    private BigDecimal areaDeseada;

    @Enumerated(EnumType.STRING)
    @Column(name = "forma_pago", nullable = false)
    private FormaPago formaPago = FormaPago.POR_DEFINIR;

    private String mensaje;

    @Column(nullable = false)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MedioContacto medio;

    @Column(nullable = false)
    private String contacto;

    @Column(nullable = false, updatable = false)
    private boolean consentimiento;

    @Column(name = "consentimiento_version", nullable = false, updatable = false)
    private String consentimientoVersion;

    @Column(name = "consentimiento_en", nullable = false, updatable = false)
    private Instant consentimientoEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EtapaInteres etapa = EtapaInteres.NUEVO;

    /** Código de cuenta del asesor o gestor a cargo. */
    private String responsable;

    @Column(name = "proxima_accion")
    private String proximaAccion;

    @Column(name = "proxima_accion_fecha")
    private LocalDate proximaAccionFecha;

    /** Precarga: días respecto del arranque para la próxima acción; null en un registro real o tocado por una persona. */
    @Column(name = "semilla_desfase")
    private Integer semillaDesfase;
}
