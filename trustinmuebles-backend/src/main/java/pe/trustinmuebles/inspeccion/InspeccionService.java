package pe.trustinmuebles.inspeccion;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.shared.NivelRiesgo;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/** API pública del módulo de inspección estructural (REQ-F02). */
@Service
@Transactional
public class InspeccionService {
    public record NuevoPin(double x, double y, NivelRiesgo severidad, String titulo, String descripcion) {}

    private final InspeccionRepository repo;

    InspeccionService(InspeccionRepository repo) {
        this.repo = repo;
    }

    public InspeccionDto crear(Long inmuebleId, Long planoId, String inspector) {
        Inspeccion i = new Inspeccion();
        i.setInmuebleId(inmuebleId);
        i.setPlanoId(planoId);
        i.setInspectorNombre(inspector);
        i.setFecha(Instant.now().truncatedTo(ChronoUnit.MILLIS));
        return aDto(repo.save(i));
    }

    public InspeccionDto agregarPin(Long inspeccionId, NuevoPin p) {
        Inspeccion i = obtener(inspeccionId);
        if (i.getEstado() == EstadoInspeccion.CERRADA) {
            throw new ReglaNegocioException("La inspección ya está cerrada");
        }
        if (p.x() < 0 || p.x() > 1 || p.y() < 0 || p.y() > 1) {
            throw new IllegalArgumentException("Las coordenadas del pin deben estar entre 0 y 1");
        }
        PinFalla pin = new PinFalla();
        pin.setInspeccion(i);
        pin.setX(p.x());
        pin.setY(p.y());
        pin.setSeveridad(p.severidad());
        pin.setTitulo(p.titulo());
        pin.setDescripcion(p.descripcion());
        i.getPines().add(pin);
        return aDto(repo.save(i));
    }

    public InspeccionDto cerrar(Long inspeccionId, String dictamen) {
        Inspeccion i = obtener(inspeccionId);
        if (i.getEstado() == EstadoInspeccion.CERRADA) return aDto(i);
        i.setEstado(EstadoInspeccion.CERRADA);
        i.setDictamen(dictamen);
        i.setNivelEstructural(nivelDe(i));
        return aDto(i);
    }

    @Transactional(readOnly = true)
    public Optional<InspeccionDto> ultimaCerrada(Long inmuebleId) {
        return repo.findFirstByInmuebleIdAndEstadoOrderByFechaDescIdDesc(inmuebleId, EstadoInspeccion.CERRADA)
                .map(this::aDto);
    }

    @Transactional(readOnly = true)
    public InspeccionDto detalle(Long id) {
        return aDto(obtener(id));
    }

    private Inspeccion obtener(Long id) {
        return repo.findById(id).orElseThrow(() -> new NoEncontradoException("Inspección", id));
    }

    private static NivelRiesgo nivelDe(Inspeccion i) {
        return i.getPines().stream().map(PinFalla::getSeveridad).reduce(NivelRiesgo.VERDE, NivelRiesgo::peor);
    }

    private InspeccionDto aDto(Inspeccion i) {
        List<InspeccionDto.PinDto> pines = i.getPines().stream().map(p -> new InspeccionDto.PinDto(p.getId(),
                p.getX(), p.getY(), p.getSeveridad(), p.getTitulo(), p.getDescripcion())).toList();
        return new InspeccionDto(i.getId(), i.getInmuebleId(), i.getPlanoId(), i.getInspectorNombre(),
                i.getDictamen(), i.getEstado(),
                i.getEstado() == EstadoInspeccion.CERRADA ? i.getNivelEstructural() : nivelDe(i), i.getFecha(), pines);
    }
}
