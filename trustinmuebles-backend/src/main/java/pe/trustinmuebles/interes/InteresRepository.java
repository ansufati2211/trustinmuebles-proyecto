package pe.trustinmuebles.interes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface InteresRepository extends JpaRepository<Interes, Long> {
    List<Interes> findAllByOrderByCreadoEnDescIdDesc();

    List<Interes> findBySemillaDesfaseIsNotNull();

    /** v1.0 (etapa 9): cuántos hay en una etapa (el aviso de interesados nuevos del menú). */
    long countByEtapa(EtapaInteres etapa);
}
