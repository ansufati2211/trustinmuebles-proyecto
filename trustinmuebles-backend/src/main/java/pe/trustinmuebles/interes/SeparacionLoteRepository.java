package pe.trustinmuebles.interes;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface SeparacionLoteRepository extends JpaRepository<SeparacionLote, Long> {
    List<SeparacionLote> findByInteresIdOrderByIdAsc(Long interesId);

    /** La separación o venta vigente del interesado (activa o vendida): a lo sumo una. */
    Optional<SeparacionLote> findFirstByInteresIdAndEstadoInOrderByIdDesc(Long interesId,
            java.util.Collection<SeparacionLote.Estado> estados);

    /** Separaciones activas o ventas de un lote de proyecto, de cualquier interesado. */
    List<SeparacionLote> findByProyectoCodigoAndLoteClaveAndEstadoIn(String proyectoCodigo, String loteClave,
            java.util.Collection<SeparacionLote.Estado> estados);

    /** Separaciones activas o ventas de un caso, de cualquier interesado. */
    List<SeparacionLote> findByCasoCodigoAndEstadoIn(String casoCodigo, java.util.Collection<SeparacionLote.Estado> estados);
}
