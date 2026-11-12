package pe.trustinmuebles.expediente;

import java.util.List;
import org.springframework.data.repository.Repository;

/** Solo adición: guardar y consultar, sin actualizar ni borrar. */
interface HistorialLoteProyectoRepository extends Repository<HistorialLoteProyecto, Long> {
    HistorialLoteProyecto save(HistorialLoteProyecto h);

    List<HistorialLoteProyecto> findByProyectoCodigoAndLoteClaveOrderByIdAsc(String proyectoCodigo, String loteClave);

    List<HistorialLoteProyecto> findByProyectoCodigoOrderByIdAsc(String proyectoCodigo);
}
