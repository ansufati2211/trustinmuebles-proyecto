package pe.trustinmuebles.checklist;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.shared.NoEncontradoException;

/**
 * API pública del módulo de checklist (REQ-F06). El estado del checklist no cambia el color del semáforo
 * (decisión del equipo, ver docs/decisiones.md).
 */
@Service
@Transactional
public class ChecklistService {
    private final ItemChecklistRepository repo;

    ChecklistService(ItemChecklistRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<ItemChecklistDto> listar(Long expedienteId) {
        return repo.findByExpedienteIdOrderByOrdenAscIdAsc(expedienteId).stream().map(ItemChecklist::dto).toList();
    }

    @Transactional(readOnly = true)
    public long contarPendientes(Long expedienteId) {
        return repo.countByExpedienteIdAndEstado(expedienteId, EstadoItem.PENDIENTE);
    }

    public ItemChecklistDto agregar(Long expedienteId, String nombre, EstadoItem estado, int orden) {
        return agregar(expedienteId, nombre, estado, null, orden);
    }

    public ItemChecklistDto agregar(Long expedienteId, String nombre, EstadoItem estado, String observacion, int orden) {
        ItemChecklist i = new ItemChecklist();
        i.setExpedienteId(expedienteId);
        i.setNombre(nombre);
        i.setEstado(estado);
        i.setObservacion(observacion);
        i.setOrden(orden);
        return repo.save(i).dto();
    }

    /** Solo cambia ítems del expediente indicado: un id de otro caso responde 404. */
    public ItemChecklistDto actualizar(Long expedienteId, Long itemId, EstadoItem estado, String observacion) {
        ItemChecklist i = repo.findByIdAndExpedienteId(itemId, expedienteId)
                .orElseThrow(() -> new NoEncontradoException("Ítem de checklist", itemId));
        i.setEstado(estado);
        i.setObservacion(observacion);
        return i.dto();
    }
}
