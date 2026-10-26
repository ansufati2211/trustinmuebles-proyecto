package pe.trustinmuebles.cartera;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface SolicitudContactoRepository extends JpaRepository<SolicitudContacto, Long> {
    boolean existsByPendienteClave(String pendienteClave);

    List<SolicitudContacto> findAllByOrderByIdAsc();

    List<SolicitudContacto> findByEstadoOrderByIdAsc(EstadoContacto estado);
}
