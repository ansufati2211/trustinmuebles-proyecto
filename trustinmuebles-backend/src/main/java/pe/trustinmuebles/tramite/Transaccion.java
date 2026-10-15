package pe.trustinmuebles.tramite;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "transaccion")
@Getter
@Setter
class Transaccion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inmueble_id", nullable = false)
    private Long inmuebleId;

    @Column(name = "comprador_id", nullable = false)
    private Long compradorId;

    @Column(name = "gestor_id")
    private Long gestorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EtapaTramite etapa = EtapaTramite.OFERTA_ACEPTADA;

    @Column(name = "precio_acordado", nullable = false)
    private BigDecimal precioAcordado;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    @Column(name = "actualizada_en", nullable = false)
    private Instant actualizadaEn;
}
