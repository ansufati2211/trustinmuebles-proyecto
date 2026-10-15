package pe.trustinmuebles.semaforo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.trustinmuebles.shared.NivelRiesgo;

interface EvaluacionRepository extends JpaRepository<EvaluacionLegal, Long> {
    Optional<EvaluacionLegal> findFirstByInmuebleIdOrderByFechaDescIdDesc(Long inmuebleId);

    @Query("select e.nivel, count(e) from EvaluacionLegal e where e.id in "
            + "(select max(x.id) from EvaluacionLegal x group by x.inmuebleId) group by e.nivel")
    List<Object[]> distribucionUltimas();
}
