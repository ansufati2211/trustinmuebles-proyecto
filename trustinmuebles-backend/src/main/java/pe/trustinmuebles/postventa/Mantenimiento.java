package pe.trustinmuebles.postventa;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "mantenimiento")
@Getter
@Setter
class Mantenimiento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "propiedad_id", nullable = false)
    private Long propiedadId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private String servicio;

    @Column(name = "inversion_usd", nullable = false)
    private BigDecimal inversionUsd;

    @Column(name = "comprobante_archivo_id")
    private String comprobanteArchivoId;
}
