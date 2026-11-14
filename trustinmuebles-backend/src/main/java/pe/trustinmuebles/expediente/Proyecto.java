package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * v1.0 (etapa 3a): proyecto de urbanización de la inmobiliaria. Agrupa los lotes de su plano y, opcionalmente, apunta al
 * caso de su partida matriz, cuyo indicador A se muestra en los lotes que todavía no tienen caso propio.
 */
@Entity
@Table(name = "proyecto")
@Getter
@Setter
class Proyecto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombre en minúsculas, sin tildes y con guiones (CodigoProyecto). Es el que va en la URL. */
    @Column(nullable = false, unique = true, length = 80)
    private String codigo;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 80)
    private String distrito;

    @Column(length = 1500)
    private String descripcion;

    /** Recorrido o video publicado por la inmobiliaria. Solo se muestra si hay enlace. */
    @Column(name = "recorrido_url", length = 300)
    private String recorridoUrl;

    /** Código del caso de la partida matriz; null si el proyecto no la tiene registrada. */
    @Column(name = "caso_matriz_codigo", length = 40)
    private String casoMatrizCodigo;

    /** v1.0 (etapa 9): dirección del proyecto; opcional. */
    @Column(length = 200)
    private String direccion;

    /** v1.0 (etapa 9): enlace de mapa (https) que abre «Cómo llegar» en otra pestaña; opcional. */
    @Column(name = "mapa_url", length = 500)
    private String mapaUrl;

    /** v1.0 (etapa 9): condiciones de pago en texto libre, hasta 500 caracteres; opcional. Sin cálculos. */
    @Column(name = "condiciones_pago", length = 500)
    private String condicionesPago;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant creadoEn;

    @OneToMany(mappedBy = "proyecto", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden asc")
    private List<HitoProyecto> hitos = new ArrayList<>();

    @PrePersist
    void alCrear() {
        if (creadoEn == null) creadoEn = Instant.now();
    }
}
