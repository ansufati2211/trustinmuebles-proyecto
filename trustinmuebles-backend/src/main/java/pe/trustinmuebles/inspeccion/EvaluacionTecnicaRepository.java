package pe.trustinmuebles.inspeccion;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface EvaluacionTecnicaRepository extends JpaRepository<EvaluacionTecnica, Long> {
    Optional<EvaluacionTecnica> findByExpedienteId(Long expedienteId);
}
