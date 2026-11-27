package pe.trustinmuebles.interes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface HistorialEtapaRepository extends JpaRepository<HistorialEtapa, Long> {
    List<HistorialEtapa> findByInteresIdOrderByIdAsc(Long interesId);
}
