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

    /** Número de partida simulado, con el prefijo SIM- para que no se confunda con uno real. */
    @Column(nullable = false, unique = true)
    private String codigo;

    /** Cómo se presenta el predio, por ejemplo «Mz. F Lote 7 · Hab. Urb. Santa Elvira · Parcona, Ica». */
    @Column(nullable = false)
    private String denominacion;

    /** Distrito o nota breve que se muestra bajo la denominación. */
    @Column(nullable = false)
    private String contexto;

    @Column(nullable = false)
    private boolean sintetico = true;

    /** Revisor responsable del registro del caso. No otorga edición al comprador. */
    @Column(name = "responsable_id", nullable = false)
    private Long responsableId;
}
