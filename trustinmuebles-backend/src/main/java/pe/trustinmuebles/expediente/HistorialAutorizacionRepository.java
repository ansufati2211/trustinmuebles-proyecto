package pe.trustinmuebles.expediente;

import java.util.List;
import org.springframework.data.repository.Repository;

/** Solo adición (como el historial de evaluaciones): guardar y consultar, sin actualizar ni borrar. */
interface HistorialAutorizacionRepository extends Repository<HistorialAutorizacion, Long> {
    HistorialAutorizacion save(HistorialAutorizacion h);

    List<HistorialAutorizacion> findByCasoCodigoOrderByIdAsc(String casoCodigo);

    boolean existsByCasoCodigo(String casoCodigo);
}
