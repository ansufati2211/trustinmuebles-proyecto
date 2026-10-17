package pe.trustinmuebles.clasificacion;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReglaRepository extends JpaRepository<Regla, Long> {
    List<Regla> findByVersionOrderById(String version);

    boolean existsByCodigoAndVersion(String codigo, String version);
}
