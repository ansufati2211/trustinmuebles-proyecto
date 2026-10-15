package pe.trustinmuebles.inmueble;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface PlanoRepository extends JpaRepository<Plano2D, Long> {
    List<Plano2D> findByInmuebleIdOrderByIdAsc(Long inmuebleId);

    Optional<Plano2D> findFirstByInmuebleIdOrderByIdAsc(Long inmuebleId);
}
