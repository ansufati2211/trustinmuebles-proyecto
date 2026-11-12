package pe.trustinmuebles.expediente;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExpedienteRepository extends JpaRepository<Expediente, Long> {
    Optional<Expediente> findByCasoCodigo(String codigo);

    List<Expediente> findAllByOrderByCasoCodigoAsc();

    /** v1.0: los expedientes de casos publicados, con su caso ya cargado (portal público). */
    @org.springframework.data.jpa.repository.Query("select e from Expediente e join fetch e.caso c "
            + "where c.estadoPublicacion = pe.trustinmuebles.expediente.EstadoPublicacion.PUBLICADO")
    List<Expediente> findPublicados();

    /** v1.0 (etapa 3a): los expedientes de los casos indicados (las partidas matrices de los proyectos). */
    @org.springframework.data.jpa.repository.Query("select e from Expediente e join fetch e.caso c where c.codigo in ?1")
    List<Expediente> findConCasoEntre(java.util.Collection<String> codigos);
}
