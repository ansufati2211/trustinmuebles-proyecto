package pe.trustinmuebles.clasificacion;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface EvaluacionRepository extends JpaRepository<EvaluacionInformativa, Long> {
    Optional<EvaluacionInformativa> findByExpedienteId(Long expedienteId);

    /** Solo el id del expediente y su estado (sin leer el detalle JSON): para filtrar por indicador A. */
    @org.springframework.data.jpa.repository.Query(
            "select e.expedienteId, e.estado from EvaluacionInformativa e where e.expedienteId in :ids")
    java.util.List<Object[]> estadosDe(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids);

    java.util.List<EvaluacionInformativa> findByExpedienteIdIn(java.util.Collection<Long> expedienteIds);
}
