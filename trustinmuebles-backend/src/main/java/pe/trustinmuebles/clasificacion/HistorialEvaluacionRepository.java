package pe.trustinmuebles.clasificacion;

import java.util.List;
import org.springframework.data.repository.Repository;

/** Solo adición (I12): a propósito no extiende JpaRepository, así que no tiene métodos para borrar. */
interface HistorialEvaluacionRepository extends Repository<HistorialEvaluacion, Long> {
    HistorialEvaluacion save(HistorialEvaluacion fila);

    List<HistorialEvaluacion> findByExpedienteIdOrderByIdAsc(Long expedienteId);

    boolean existsByExpedienteId(Long expedienteId);
}
