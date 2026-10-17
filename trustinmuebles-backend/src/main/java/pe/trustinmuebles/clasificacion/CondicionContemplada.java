package pe.trustinmuebles.clasificacion;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "condicion_contemplada")
@Getter
@Setter
class CondicionContemplada {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "version_reglas", nullable = false)
    private String versionReglas;

    @Column(nullable = false)
    private String texto;
}
