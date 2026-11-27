package pe.trustinmuebles.interes;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * v2.0 (RF41, RF42, RN29, RN31): separación o venta de un lote (o de un caso) por un interesado. Mientras está ACTIVA el
 * lote está separado para ese interesado y nadie más puede separarlo; VENDIDA cuando se cierra la venta (una venta con
 * depósito no se retrotrae); LIBERADA cuando se descarta, con fecha, cuenta y motivo.
 */
@Entity
@Table(name = "separacion_lote")
@Getter
@Setter
class SeparacionLote {
    enum Estado { ACTIVA, VENDIDA, LIBERADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interes_id", nullable = false, updatable = false)
    private Long interesId;

    @Column(name = "caso_codigo", updatable = false)
    private String casoCodigo;

    @Column(name = "proyecto_codigo", updatable = false)
    private String proyectoCodigo;

    @Column(name = "lote_clave", updatable = false)
    private String loteClave;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Estado estado = Estado.ACTIVA;

    @Column(name = "con_deposito", nullable = false)
    private boolean conDeposito;

    @Column(name = "creada_en", nullable = false, updatable = false)
    private Instant creadaEn;

    @Column(name = "creada_por", nullable = false, updatable = false)
    private String creadaPor;

    @Column(name = "cerrada_en")
    private Instant cerradaEn;

    @Column(name = "cerrada_por")
    private String cerradaPor;

    private String motivo;

    /** ¿Es del mismo lote o caso que el interesado? */
    boolean mismoInmueble(String caso, String proyecto, String lote) {
        if (casoCodigo != null) return casoCodigo.equals(caso);
        return proyectoCodigo != null && proyectoCodigo.equals(proyecto) && loteClave != null && loteClave.equals(lote);
    }
}
