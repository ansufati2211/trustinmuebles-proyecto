package pe.trustinmuebles.postventa;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "propiedad_adquirida")
@Getter
@Setter
class PropiedadAdquirida {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "inmueble_id", nullable = false)
    private Long inmuebleId;

    @Column(name = "transaccion_id", nullable = false, unique = true)
    private Long transaccionId;

    @Column(name = "fecha_compra", nullable = false)
    private Instant fechaCompra;

    @Column(name = "valor_compra", nullable = false)
    private BigDecimal valorCompra;
}
