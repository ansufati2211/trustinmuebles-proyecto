package pe.trustinmuebles.expediente;

import org.springframework.data.jpa.repository.JpaRepository;

interface CasoLoteRepository extends JpaRepository<CasoLote, Long> {
    boolean existsByCodigo(String codigo);
}
