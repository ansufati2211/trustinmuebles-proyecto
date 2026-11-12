package pe.trustinmuebles.interes;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.trustinmuebles.interes.Opciones.EstadoCita;

interface CitaRepository extends JpaRepository<Cita, Long> {
    List<Cita> findByInteresIdOrderByIdAsc(Long interesId);

    List<Cita> findBySemillaDesfaseIsNotNull();

    /** Citas del rango: acordadas en esas fechas o, si están por confirmar, con alguna fecha propuesta ahí. */
    @Query("select c from Cita c where (c.estado in ?3 and c.fechaAcordada between ?1 and ?2) "
            + "or (c.estado = ?4 and (c.fecha1 between ?1 and ?2 or c.fecha2 between ?1 and ?2))")
    List<Cita> enRango(LocalDate desde, LocalDate hasta, Collection<EstadoCita> agendadas, EstadoCita porConfirmar);

    default List<Cita> enRango(LocalDate desde, LocalDate hasta) {
        return enRango(desde, hasta, List.of(EstadoCita.CONFIRMADA, EstadoCita.REPROGRAMADA), EstadoCita.SOLICITADA);
    }
}
