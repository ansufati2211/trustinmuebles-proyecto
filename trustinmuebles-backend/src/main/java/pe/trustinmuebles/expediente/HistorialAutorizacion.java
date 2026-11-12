package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

/** v1.0: una autorización otorgada o retirada, con su autor y su fecha. De solo adición: no se edita ni se borra. */
@Entity
@Immutable
@Table(name = "historial_autorizacion")
@Getter
@Setter
class HistorialAutorizacion {
    enum Accion { OTORGADA, RETIRADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "caso_codigo", nullable = false, updatable = false)
    private String casoCodigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Accion accion;

    @Enumerated(EnumType.STRING)
    @Column(name = "en_nombre_de", nullable = false, updatable = false)
    private TitularidadComercial enNombreDe;

    @Column(name = "cuenta_codigo", nullable = false, updatable = false)
    private String cuentaCodigo;

    @Column(name = "registrada_en", nullable = false, updatable = false)
    private Instant registradaEn;
}
