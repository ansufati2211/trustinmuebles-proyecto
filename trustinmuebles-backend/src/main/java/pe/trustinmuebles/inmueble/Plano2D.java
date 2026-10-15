package pe.trustinmuebles.inmueble;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "plano2d")
@Getter
@Setter
class Plano2D {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inmueble_id", nullable = false)
    private Long inmuebleId;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "imagen_url", nullable = false)
    private String imagenUrl;
}
