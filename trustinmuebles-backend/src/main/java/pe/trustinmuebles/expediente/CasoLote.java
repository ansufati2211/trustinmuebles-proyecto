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

    /** Dónde se consultó una partida transcrita, por ejemplo «Conoce Aquí – SUNARP». */
    private String fuente;

    @Column(name = "fecha_consulta")
    private java.time.LocalDate fechaConsulta;

    /** El revisor confirmó que la transcripción no contiene nombres, DNI ni domicilios de personas naturales. */
    @Column(name = "sin_datos_personales", nullable = false)
    private boolean sinDatosPersonales;

    enum Origen { SINTETICO, TRANSCRITA }

    /** Distrito del predio, para el catálogo y sus filtros. */
    private String distrito;

    /** Precio referencial en soles. Es informativo, no una oferta; las partidas transcritas no lo tienen. */
    @Column(name = "precio_referencial")
    private java.math.BigDecimal precioReferencial;

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
}
