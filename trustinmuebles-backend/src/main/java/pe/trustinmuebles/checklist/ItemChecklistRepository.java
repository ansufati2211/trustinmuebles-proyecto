package pe.trustinmuebles.checklist;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ItemChecklistRepository extends JpaRepository<ItemChecklist, Long> {
    List<ItemChecklist> findByExpedienteIdOrderByOrdenAscIdAsc(Long expedienteId);

    Optional<ItemChecklist> findByIdAndExpedienteId(Long id, Long expedienteId);

    long countByExpedienteIdAndEstado(Long expedienteId, EstadoItem estado);
}
