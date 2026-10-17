package pe.trustinmuebles.checklist;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "item_checklist")
@Getter
@Setter
class ItemChecklist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expediente_id", nullable = false)
    private Long expedienteId;

    @Column(nullable = false)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoItem estado;

    private String observacion;

    @Column(nullable = false)
    private int orden;

    ItemChecklistDto dto() {
        return new ItemChecklistDto(id, nombre, estado, observacion);
    }
}
