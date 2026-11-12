package pe.trustinmuebles.expediente;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExpedienteRepository extends JpaRepository<Expediente, Long> {
    Optional<Expediente> findByCasoCodigo(String codigo);

    List<Expediente> findAllByOrderByCasoCodigoAsc();

    /** v1.0: los expedientes de casos publicados, con su caso ya cargado (portal público). */
    @org.springframework.data.jpa.repository.Query("select e from Expediente e join fetch e.caso c "
            + "where c.estadoPublicacion = pe.trustinmuebles.expediente.EstadoPublicacion.PUBLICADO")
    List<Expediente> findPublicados();
}
