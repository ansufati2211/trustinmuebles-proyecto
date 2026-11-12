package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

/** v1.0 (etapa 3b): un lote creado o actualizado por carga masiva, con su autor y su fecha. De solo adición. */
@Entity
@Immutable
@Table(name = "historial_lote_proyecto")
@Getter
@Setter
class HistorialLoteProyecto {
    enum Accion { CREADO, ACTUALIZADO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "proyecto_codigo", nullable = false, updatable = false)
    private String proyectoCodigo;

    @Column(name = "lote_clave", nullable = false, updatable = false)
    private String loteClave;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Accion accion;

    @Column(nullable = false, updatable = false)
    private String origen = "CSV";

    @Column(nullable = false, updatable = false, length = 1000)
    private String cambios;

    @Column(name = "carga_id", nullable = false, updatable = false)
    private String cargaId;

    @Column(name = "cuenta_codigo", nullable = false, updatable = false)
    private String cuentaCodigo;

    @Column(name = "registrada_en", nullable = false, updatable = false)
    private Instant registradaEn;
}
