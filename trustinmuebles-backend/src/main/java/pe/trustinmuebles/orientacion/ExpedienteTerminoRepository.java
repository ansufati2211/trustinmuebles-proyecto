package pe.trustinmuebles.orientacion;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExpedienteTerminoRepository extends JpaRepository<ExpedienteTermino, Long> {
    List<ExpedienteTermino> findByExpedienteIdOrderByTerminoConceptoAsc(Long expedienteId);

    boolean existsByExpedienteIdAndTerminoId(Long expedienteId, Long terminoId);
}
