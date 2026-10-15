package pe.trustinmuebles.inmueble;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface InmuebleRepository extends JpaRepository<Inmueble, Long> {
    List<Inmueble> findAllByOrderByPublicadoEnDescIdDesc();
}
