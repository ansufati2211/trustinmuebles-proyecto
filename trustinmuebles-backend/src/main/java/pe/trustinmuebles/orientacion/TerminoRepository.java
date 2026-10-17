package pe.trustinmuebles.orientacion;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface TerminoRepository extends JpaRepository<TerminoGlosario, Long> {
    Optional<TerminoGlosario> findByConcepto(String concepto);

    List<TerminoGlosario> findAllByOrderByConceptoAsc();
}
