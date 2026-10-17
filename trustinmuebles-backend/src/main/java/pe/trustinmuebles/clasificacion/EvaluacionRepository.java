package pe.trustinmuebles.clasificacion;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface EvaluacionRepository extends JpaRepository<EvaluacionInformativa, Long> {
    Optional<EvaluacionInformativa> findByExpedienteId(Long expedienteId);
}
