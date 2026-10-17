package pe.trustinmuebles.expediente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Caso ficticio creado para tareas académicas. Nunca corresponde a un predio real (RN-01). */
@Entity
@Table(name = "caso_lote")
@Getter
@Setter
class CasoLote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String codigo;

    @Column(nullable = false)
    private String contexto;

    @Column(nullable = false)
    private boolean sintetico = true;

    /** Revisor responsable del registro del caso. No otorga edición al comprador. */
    @Column(name = "responsable_id", nullable = false)
    private Long responsableId;
}
