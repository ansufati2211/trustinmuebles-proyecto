package pe.trustinmuebles.tramite;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface TransaccionRepository extends JpaRepository<Transaccion, Long> {
    List<Transaccion> findByCompradorIdOrderByCreadaEnDesc(Long compradorId);

    List<Transaccion> findByGestorIdOrderByCreadaEnDesc(Long gestorId);

    boolean existsByCompradorIdAndInmuebleIdAndEtapaNot(Long compradorId, Long inmuebleId, EtapaTramite etapa);
}

interface EventoRepository extends JpaRepository<EventoTimeline, Long> {
    List<EventoTimeline> findByTransaccionIdOrderByIdAsc(Long transaccionId);

    Optional<EventoTimeline> findFirstByTransaccionIdOrderByIdDesc(Long transaccionId);

    List<EventoTimeline> findByTipo(String tipo);
}

interface DocumentoRepository extends JpaRepository<Documento, Long> {
    List<Documento> findByTransaccionIdOrderByIdAsc(Long transaccionId);
}

interface MensajeRepository extends JpaRepository<MensajeAsesor, Long> {
    List<MensajeAsesor> findByTransaccionIdOrderByIdAsc(Long transaccionId);
}
