package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Partida de lote: ficticia (prefijo SIM-) o transcrita de una consulta pública sin datos de personas naturales. */
@Entity
@Table(name = "caso_lote")
@Getter
@Setter
class CasoLote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Número de partida simulado, con el prefijo SIM- para que no se confunda con uno real. */
    @Column(nullable = false, unique = true)
    private String codigo;

    /** Cómo se presenta el predio, por ejemplo «Mz. F Lote 7 · Hab. Urb. Santa Elvira · Parcona, Ica». */
    @Column(nullable = false)
    private String denominacion;

    /** Distrito o nota breve que se muestra bajo la denominación. */
    @Column(nullable = false)
    private String contexto;

    @Column(nullable = false)
    private boolean sintetico = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Origen origen = Origen.SINTETICO;

    /** Procedencia de una partida captada, por ejemplo «Conoce Aquí – SUNARP». Los casos de demostración no la tienen. */
    private String fuente;

    @Column(name = "fecha_consulta")
    private java.time.LocalDate fechaConsulta;

    /** El revisor confirmó que la transcripción no contiene nombres, DNI ni domicilios de personas naturales. */
    @Column(name = "sin_datos_personales", nullable = false)
    private boolean sinDatosPersonales;

    enum Origen { SINTETICO, TRANSCRITA }

    /** Distrito del predio, para el catálogo y sus filtros. */
    private String distrito;

    /** Precio referencial. Es informativo, no una oferta; en una partida captada es opcional. */
    @Column(name = "precio_referencial")
    private java.math.BigDecimal precioReferencial;

    /** v0.9: moneda del precio, PEN o USD (el precio base de una subasta de la SBN se publica en dólares). */
    @Column(nullable = false, length = 3)
    private String moneda = "PEN";

    /** v0.9: nota propia del precio. Si no hay, se muestra la nota general del precio referencial. */
    @Column(name = "precio_nota", length = 200)
    private String precioNota;

    /** v0.9: enlace a la publicación oficial de la que salen los datos (por ejemplo, la subasta de la SBN). */
    @Column(name = "fuente_url", length = 300)
    private String fuenteUrl;

    /** Revisor responsable del registro del caso. No otorga edición al comprador. */
    @Column(name = "responsable_id", nullable = false)
    private Long responsableId;

    /** Cuenta del propietario (I11: solo el código, sin nombre ni DNI). Lo indica el revisor al crear el expediente. */
    @Column(name = "propietario_codigo")
    private String propietarioCodigo;

    /** Cuándo autorizó el propietario la publicación. Null si no hay autorización vigente. */
    @Column(name = "autorizacion_fecha")
    private java.time.Instant autorizacionFecha;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_publicacion", nullable = false)
    private EstadoPublicacion estadoPublicacion = EstadoPublicacion.BORRADOR;

    /** v1.0: INMOBILIARIA (autoriza el asesor o el gestor en su nombre) o PARTICULAR (solo el propietario). */
    @Enumerated(EnumType.STRING)
    @Column(name = "titularidad_comercial", nullable = false)
    private TitularidadComercial titularidadComercial = TitularidadComercial.PARTICULAR;

    /** v1.0: proyecto o urbanización del lote; null si el inmueble no pertenece a uno. */
    @Column(length = 120)
    private String proyecto;

    /** v1.0: disponibilidad comercial. Informativa: no interviene en el semáforo. */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_comercial", nullable = false)
    private EstadoComercial estadoComercial = EstadoComercial.DISPONIBLE;

    /** v1.0: independización del lote. Informativa: no cambia el indicador A. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Independizacion independizacion = Independizacion.NO_CONSTA;

    /** ¿Entró por «Registrar partida»? Toda partida captada lleva fuente; los casos de demostración, no. */
    boolean esCaptado() {
        return fuente != null;
    }
}
