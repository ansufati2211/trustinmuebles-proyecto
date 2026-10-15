package pe.trustinmuebles.inspeccion;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface InspeccionRepository extends JpaRepository<Inspeccion, Long> {
    Optional<Inspeccion> findFirstByInmuebleIdAndEstadoOrderByFechaDescIdDesc(Long inmuebleId, EstadoInspeccion estado);
}
