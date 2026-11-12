package pe.trustinmuebles.interes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface InteresRepository extends JpaRepository<Interes, Long> {
    List<Interes> findAllByOrderByCreadoEnDescIdDesc();

    List<Interes> findBySemillaDesfaseIsNotNull();
}
