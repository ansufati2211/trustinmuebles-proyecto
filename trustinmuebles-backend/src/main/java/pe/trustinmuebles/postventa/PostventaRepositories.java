package pe.trustinmuebles.postventa;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface PropiedadRepository extends JpaRepository<PropiedadAdquirida, Long> {
    List<PropiedadAdquirida> findByUsuarioIdOrderByFechaCompraDesc(Long usuarioId);

    Optional<PropiedadAdquirida> findByUsuarioIdAndInmuebleId(Long usuarioId, Long inmuebleId);

    boolean existsByTransaccionId(Long transaccionId);
}

interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {
    List<Mantenimiento> findByPropiedadIdOrderByFechaDescIdDesc(Long propiedadId);
}

interface TicketRepository extends JpaRepository<TicketGarantia, Long> {
    List<TicketGarantia> findByPropiedadIdInOrderByCreadoEnDesc(List<Long> propiedadIds);

    List<TicketGarantia> findAllByOrderByCreadoEnDesc();

    List<TicketGarantia> findByPropiedadIdOrderByCreadoEnDesc(Long propiedadId);
}
