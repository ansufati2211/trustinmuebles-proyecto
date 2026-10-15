package pe.trustinmuebles.inmueble;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "inmueble")
@Getter
@Setter
class Inmueble {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false)
    private String ubicacion;

    @Column(nullable = false)
    private String direccion;

    @Column(length = 2000)
    private String descripcion;

    @Column(name = "precio_usd", nullable = false)
    private BigDecimal precioUsd;

    @Column(nullable = false)
    private int habitaciones;

    @Column(nullable = false)
    private int banos;

    @Column(name = "area_m2", nullable = false)
    private BigDecimal areaM2;

    @Column(name = "numero_partida", nullable = false)
    private String numeroPartida;

    @Column(name = "vendedor_nombre", nullable = false)
    private String vendedorNombre;

    @Column(name = "imagen_url")
    private String imagenUrl;

    @Column(name = "publicado_en", nullable = false)
    private Instant publicadoEn = Instant.now();
}
