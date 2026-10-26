package pe.trustinmuebles.cartera;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * Solicitud de contacto de un comprador sobre un caso publicado. Solo guarda códigos de cuenta, la fecha y un motivo
 * de lista cerrada: ni nombres, ni DNI, ni teléfonos, ni texto libre (I11). El caso se guarda por valor.
 */
@Entity
@Table(name = "solicitud_contacto")
@Getter
@Setter
class SolicitudContacto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expediente_id", nullable = false)
    private Long expedienteId;

    @Column(name = "caso_codigo", nullable = false)
    private String casoCodigo;

    /** Cuenta del comprador, tomada de la sesión, nunca del cuerpo. */
    @Column(name = "comprador_codigo", nullable = false)
    private String compradorCodigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MotivoContacto motivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoContacto estado = EstadoContacto.PENDIENTE;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    @Column(name = "atendida_en")
    private Instant atendidaEn;

    @Column(name = "atendida_por")
    private String atendidaPor;

    /**
     * «comprador|caso» mientras está pendiente y null cuando se atiende. Es única en la base, así que no puede haber dos
     * solicitudes pendientes del mismo comprador sobre el mismo caso, ni siquiera con dos peticiones simultáneas.
     */
    @Column(name = "pendiente_clave", unique = true)
    private String pendienteClave;
}
