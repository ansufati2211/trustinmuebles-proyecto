package pe.trustinmuebles.postventa;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ticket_garantia")
@Getter
@Setter
class TicketGarantia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "propiedad_id", nullable = false)
    private Long propiedadId;

    @Column(name = "transaccion_id", nullable = false)
    private Long transaccionId;

    @Column(name = "plano_id", nullable = false)
    private Long planoId;

    @Column(name = "pin_x")
    private Double pinX;

    @Column(name = "pin_y")
    private Double pinY;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 2000)
    private String descripcion;

    private String proveedor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoTicket estado = EstadoTicket.REPORTADO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrioridadTicket prioridad = PrioridadTicket.MEDIA;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;
}
