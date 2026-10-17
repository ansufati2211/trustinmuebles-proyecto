package pe.trustinmuebles.expediente;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExpedienteRepository extends JpaRepository<Expediente, Long> {
    Optional<Expediente> findByCasoCodigo(String codigo);

    List<Expediente> findAllByOrderByCasoCodigoAsc();
}
