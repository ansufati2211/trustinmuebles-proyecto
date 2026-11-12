package pe.trustinmuebles.expediente;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ProyectoRepository extends JpaRepository<Proyecto, Long> {
    Optional<Proyecto> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    List<Proyecto> findAllByOrderByNombreAsc();
}
