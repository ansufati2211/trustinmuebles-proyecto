package pe.trustinmuebles.cartera;

import java.util.List;
import org.springframework.data.repository.Repository;

/** Solo guardar y leer: el repositorio no expone métodos para editar ni borrar decisiones (historial de solo adición). */
interface DecisionCaptacionRepository extends Repository<DecisionCaptacion, Long> {
    DecisionCaptacion save(DecisionCaptacion d);

    List<DecisionCaptacion> findByCasoCodigoOrderByIdAsc(String casoCodigo);
}
