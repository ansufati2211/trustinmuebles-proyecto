package pe.trustinmuebles.expediente;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface LoteProyectoRepository extends JpaRepository<LoteProyecto, Long> {
    @Query("select l from LoteProyecto l join fetch l.proyecto p where p.codigo = ?1 order by l.manzana, l.numero")
    List<LoteProyecto> findDelProyecto(String proyectoCodigo);

    @Query("select l from LoteProyecto l join fetch l.proyecto p where p.codigo = ?1 and l.manzana = ?2 and l.numero = ?3")
    Optional<LoteProyecto> findLote(String proyectoCodigo, String manzana, int numero);

    /** Lotes marcados como publicados y sin caso propio, con su proyecto (el catálogo filtra luego la autorización). */
    @Query("select l from LoteProyecto l join fetch l.proyecto p where l.publicado = true and l.casoCodigo is null")
    List<LoteProyecto> findPublicadosSinCaso();

    Optional<LoteProyecto> findByCasoCodigo(String casoCodigo);

    long countByProyectoId(Long proyectoId);
}
